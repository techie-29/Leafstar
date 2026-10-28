-- =====================================================================
-- LEAF STAR — database v2 (single consolidated file)
-- Run ONCE on a fresh Supabase project:
--   Supabase > SQL Editor > New query > paste everything > Run.
-- Then create your owner user in Authentication > Users, and run:
--   select bootstrap_owner('your-email@example.com', 'Your Name');
--
-- Principles baked in:
--  1. STOCK IS A LEDGER. Nobody edits a stock number. Every change (production in,
--     sale out, correction, undo) is a row in stock_movements; variants.stock is a cached
--     total kept in sync by a trigger. Stock is per VARIANT (article + colour + size), in PIECES.
--  2. The PUBLIC website can read only two views: public_catalog and public_settings.
--     It never sees prices, costs, exact stock, hidden brands/articles, or out-of-stock items.
--  3. Everything else is locked to logged-in staff with a role (owner/manager for now).
--  4. Every important change is written to an append-only audit_log.
--  5. People/companies are ONE table (contacts) with roles, so a buyer who is also a supplier
--     is never entered twice.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------- enums ----------
create type app_role         as enum ('owner', 'manager', 'warehouse', 'sales', 'accounts');
create type article_category as enum ('upperwear', 'lowerwear');
create type article_source   as enum ('manufactured', 'purchased');
create type contact_role     as enum ('buyer', 'supplier', 'worker', 'employee', 'other');
create type movement_reason  as enum ('production', 'sale', 'adjustment', 'return', 'undo', 'opening');
create type bill_status      as enum ('draft', 'applied', 'undone');
create type scan_status      as enum ('queued', 'processing', 'extracted', 'failed');
create type lead_source      as enum ('request_price', 'enquiry_list', 'chatbot', 'contact_form', 'call_click', 'whatsapp', 'manual');
create type lead_stage       as enum ('new', 'contacted', 'quoted', 'negotiation', 'won', 'lost');
create type activity_kind    as enum ('note', 'call', 'whatsapp', 'stage_change', 'enquiry', 'quote', 'follow_up');
create type inbox_kind       as enum ('callback_request', 'call_tap', 'chat', 'request_price', 'contact_form', 'missed_call', 'whatsapp');
create type inbox_status     as enum ('unanswered', 'handled', 'dismissed');
create type inbox_via        as enum ('call', 'whatsapp', 'sms', 'other');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- staff profiles and roles ----------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       app_role not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- true only for an active owner/manager. (Other roles get their own policies in later phases.)
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
     where id = auth.uid() and is_active and role in ('owner', 'manager')
  );
$$;

-- One-time: makes your first Supabase user the owner. Refuses if an owner already exists.
create or replace function bootstrap_owner(p_email text, p_name text default null) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if exists (select 1 from profiles where role = 'owner') then
    raise exception 'An owner already exists';
  end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    raise exception 'No user with email %. Create the user in Authentication > Users first.', p_email;
  end if;
  insert into profiles (id, full_name, role) values (uid, p_name, 'owner');
  return 'Owner set: ' || p_email;
end $$;
revoke execute on function bootstrap_owner(text, text) from public, anon, authenticated;

-- ---------- audit log (append-only) ----------
create table audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     text,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index audit_log_row on audit_log (table_name, row_id, changed_at desc);

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  if tg_op = 'DELETE' then rid := to_jsonb(old) ->> 'id'; else rid := to_jsonb(new) ->> 'id'; end if;
  insert into audit_log (table_name, row_id, action, old_data, new_data, changed_by)
  values (tg_table_name, rid, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end,
          auth.uid());
  return null;
end $$;

create or replace function block_append_only() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only. Add a correcting row instead.', tg_table_name;
end $$;
create trigger trg_audit_no_change before update or delete on audit_log
  for each row execute function block_append_only();

-- ---------- business settings (single row) ----------
create table business_settings (
  id            boolean primary key default true check (id),   -- forces exactly one row
  business_name text not null default 'Leaf Star',
  tagline       text not null default 'Premium wear. Trusted quality.',
  phone         text,
  whatsapp      text,          -- digits only with country code, e.g. 919876543210
  email         text,
  address       text,
  city          text,
  gstin         text,
  instagram     text,
  alert_email   text,          -- PRIVATE: where new-enquiry alerts are sent
  updated_at    timestamptz not null default now()
);
insert into business_settings (id) values (true);
create trigger trg_settings_updated before update on business_settings
  for each row execute function set_updated_at();

-- ---------- locations (one for now: the factory) ----------
create table locations (
  id         uuid primary key,
  name       text not null unique,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_default_location on locations (is_default) where is_default;
insert into locations (id, name, is_default) values ('00000000-0000-0000-0000-00000000f001', 'Factory', true);

-- ---------- brands (each has a show-on-website switch) ----------
create table brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_public  boolean not null default false,   -- hidden brands never appear anywhere public
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_brands_updated before update on brands
  for each row execute function set_updated_at();

-- ---------- articles (one per design) ----------
create table articles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code = upper(code)),   -- LS-SH-0101
  name        text not null,
  category    article_category not null,
  garment     text not null,                  -- Shirt | Pant
  style       text,                           -- Cargo | Jeans | Formal | Casual ...
  brand_id    uuid not null references brands(id),
  fabric      text,
  pattern     text,
  description text,
  moq         integer not null default 50 check (moq > 0),       -- minimum order, in pieces
  lot_size    integer check (lot_size > 0),   -- pieces per fixed lot; NULL = any quantity >= moq
  hsn_code    text,                           -- for GST invoices later
  source      article_source not null default 'manufactured',
  is_public   boolean not null default false, -- also requires the brand to be public
  is_featured boolean not null default false, -- show on the home page
  is_active   boolean not null default true,  -- false = archived
  -- admin-only money field; never exposed publicly. Filled by the costing module later.
  wholesale_price numeric(12,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index articles_name_trgm on articles using gin (name gin_trgm_ops);
create index articles_brand on articles (brand_id);
create trigger trg_articles_updated before update on articles
  for each row execute function set_updated_at();

-- ---------- colours (each article has ~8-12) ----------
create table article_colors (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  name       text not null,
  code       text not null check (code = upper(code)),            -- NVY (used inside SKUs)
  hex        text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  unique (article_id, code),
  unique (article_id, name)
);

-- ---------- images: every upload is processed into several sizes ----------
create table article_images (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references articles(id) on delete cascade,
  color_id      uuid references article_colors(id) on delete set null,   -- null = general article photo
  thumb_url     text not null,              -- small, for lists and swatches
  medium_url    text not null,              -- card and page display
  url           text not null,              -- large, for zoom
  blur_data_url text,                       -- tiny blurred placeholder shown instantly
  width         integer,
  height        integer,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index article_images_article on article_images (article_id, sort_order);
create index article_images_color on article_images (color_id, sort_order);

-- ---------- variants = article + colour + size (stock attaches here) ----------
create table variants (
  id                  uuid primary key default gen_random_uuid(),
  article_id          uuid not null references articles(id) on delete cascade,
  color_id            uuid not null references article_colors(id) on delete cascade,
  size                text not null,                  -- S M L XL XXL
  size_order          integer not null default 0,
  sku                 text not null unique check (sku = upper(sku)),   -- LS-SH-0101-NVY-M
  stock               integer not null default 0 check (stock >= 0),   -- cached total; kept by trigger
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  last_movement_at    timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (color_id, size)
);
create index variants_article on variants (article_id);

-- ---------- production batches ----------
create table batches (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  produced_on date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------- contacts: buyers, suppliers, workers, employees (one table) ----------
create table contacts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  business_name      text,
  roles              contact_role[] not null default '{buyer}',
  phone              text,                           -- digits only
  email              text,
  instagram          text,
  city               text,
  gstin              text,
  credit_limit       numeric(12,2),                  -- for the money phase (buyers on credit)
  payment_terms_days integer,
  notes              text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index contacts_phone_unique on contacts (phone) where phone is not null;
create index contacts_name_trgm on contacts using gin (name gin_trgm_ops);
create trigger trg_contacts_updated before update on contacts
  for each row execute function set_updated_at();

-- ---------- bills ----------
create table bills (
  id             uuid primary key default gen_random_uuid(),
  bill_number    text,
  bill_date      date,
  contact_id     uuid references contacts(id) on delete set null,
  buyer_name_raw text,
  file_path      text,
  file_hash      text,
  extracted_json jsonb,
  total_amount   numeric(12,2),
  status         bill_status not null default 'draft',
  applied_at     timestamptz,
  applied_by     uuid references auth.users(id),
  undone_at      timestamptz,
  created_at     timestamptz not null default now()
);
-- duplicate protection (applies while a bill is applied; an undone bill can be re-applied)
create unique index bills_unique_number on bills (lower(bill_number), bill_date)
  where status = 'applied' and bill_number is not null;
create unique index bills_unique_file on bills (file_hash)
  where status = 'applied' and file_hash is not null;

create table bill_items (
  id               uuid primary key default gen_random_uuid(),
  bill_id          uuid not null references bills(id) on delete cascade,
  variant_id       uuid references variants(id),
  raw_text         text,
  extracted_name   text,
  extracted_color  text,
  extracted_size   text,
  qty              integer not null check (qty > 0),     -- always PIECES (convert lots before saving)
  rate             numeric(12,2),
  amount           numeric(12,2),
  match_method     text check (match_method in ('sku', 'alias', 'fuzzy', 'manual')),
  match_confidence numeric(4,3),
  created_at       timestamptz not null default now()
);
create index bill_items_bill on bill_items (bill_id);

-- The scanner LEARNS: a corrected match is remembered next time.
create table item_aliases (
  id         uuid primary key default gen_random_uuid(),
  alias_norm text not null unique,
  article_id uuid not null references articles(id) on delete cascade,
  color_id   uuid references article_colors(id) on delete cascade,
  size       text,
  created_at timestamptz not null default now()
);

-- ---------- bulk bill scanning queue ----------
create table bill_scan_jobs (
  id          uuid primary key default gen_random_uuid(),
  batch_ref   uuid not null,                       -- groups files uploaded together
  file_path   text not null,
  file_name   text,
  mime_type   text,
  file_size   bigint,
  file_hash   text,
  status      scan_status not null default 'queued',
  attempts    integer not null default 0,
  error       text,
  bill_id     uuid references bills(id) on delete set null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index scan_jobs_queue on bill_scan_jobs (created_at) where status = 'queued';
create index scan_jobs_batch on bill_scan_jobs (batch_ref);

-- A worker claims one queued job at a time; two workers never take the same job.
create or replace function claim_scan_job() returns bill_scan_jobs
language plpgsql as $$
declare j bill_scan_jobs;
begin
  select * into j from bill_scan_jobs
   where status = 'queued' order by created_at
   for update skip locked limit 1;
  if not found then return null; end if;
  update bill_scan_jobs
     set status = 'processing', started_at = now(), attempts = attempts + 1
   where id = j.id returning * into j;
  return j;
end $$;
revoke execute on function claim_scan_job() from public, anon, authenticated;

-- ---------- THE LEDGER ----------
create table stock_movements (
  id                   uuid primary key default gen_random_uuid(),
  variant_id           uuid not null references variants(id),
  location_id          uuid not null default '00000000-0000-0000-0000-00000000f001' references locations(id),
  qty_change           integer not null check (qty_change <> 0),     -- + in, - out (pieces)
  reason               movement_reason not null,
  bill_id              uuid references bills(id),
  batch_id             uuid references batches(id),
  reverses_movement_id uuid references stock_movements(id),
  note                 text,
  created_by           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  -- corrections must explain themselves; production must name its batch
  check (reason <> 'adjustment' or coalesce(length(trim(note)), 0) > 0)
);
create index stock_movements_variant on stock_movements (variant_id, created_at desc);
create index stock_movements_bill on stock_movements (bill_id);
create index stock_movements_batch on stock_movements (batch_id);

create or replace function apply_stock_movement() returns trigger
language plpgsql as $$
begin
  update variants
     set stock = stock + new.qty_change, last_movement_at = now()
   where id = new.variant_id;
  return new;
end $$;
create trigger trg_apply_movement after insert on stock_movements
  for each row execute function apply_stock_movement();
create trigger trg_ledger_no_change before update or delete on stock_movements
  for each row execute function block_append_only();

create view stock_by_location with (security_invoker = true) as
  select variant_id, location_id, sum(qty_change)::int as qty
    from stock_movements group by variant_id, location_id;

-- ---------- apply a scanned bill (all-or-nothing) ----------
create or replace function apply_bill(p_bill_id uuid) returns void
language plpgsql as $$
declare
  b bills%rowtype;
  r record;
begin
  select * into b from bills where id = p_bill_id for update;
  if not found then raise exception 'Bill not found'; end if;
  if b.status <> 'draft' then raise exception 'Bill is already %', b.status; end if;
  if not exists (select 1 from bill_items where bill_id = p_bill_id) then
    raise exception 'Bill has no items';
  end if;
  if exists (select 1 from bill_items where bill_id = p_bill_id and variant_id is null) then
    raise exception 'Some items are not matched to a product yet';
  end if;

  for r in
    select variant_id, sum(qty)::int as qty
      from bill_items where bill_id = p_bill_id group by variant_id
  loop
    -- variants.stock >= 0 makes the whole call fail if any line would oversell
    insert into stock_movements (variant_id, qty_change, reason, bill_id, created_by)
    values (r.variant_id, -r.qty, 'sale', p_bill_id, auth.uid());
  end loop;

  update bills set status = 'applied', applied_at = now(), applied_by = auth.uid()
   where id = p_bill_id;
end $$;

create or replace function undo_bill(p_bill_id uuid) returns void
language plpgsql as $$
declare b bills%rowtype;
begin
  select * into b from bills where id = p_bill_id for update;
  if not found then raise exception 'Bill not found'; end if;
  if b.status <> 'applied' then raise exception 'Only an applied bill can be undone'; end if;

  insert into stock_movements (variant_id, qty_change, reason, bill_id, reverses_movement_id, created_by)
  select m.variant_id, -m.qty_change, 'undo', m.bill_id, m.id, auth.uid()
    from stock_movements m
   where m.bill_id = p_bill_id and m.reason = 'sale'
     and not exists (select 1 from stock_movements u where u.reverses_movement_id = m.id);

  update bills set status = 'undone', undone_at = now() where id = p_bill_id;
end $$;
revoke execute on function apply_bill(uuid) from public, anon;
revoke execute on function undo_bill(uuid) from public, anon;

-- ---------- visitors, chat (written only by server code) ----------
create table visitors (
  id          uuid primary key,                  -- anonymous id generated in the visitor's browser
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  name        text,
  phone       text,
  instagram   text,
  consent_at  timestamptz,
  preferences jsonb not null default '{}',
  memory      text
);

create table visitor_events (
  id         uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references visitors(id) on delete cascade,
  kind       text not null check (kind in ('page_view', 'article_view', 'search', 'filter', 'enquiry_add', 'request_price', 'chat_open')),
  article_id uuid references articles(id) on delete set null,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index visitor_events_visitor on visitor_events (visitor_id, created_at desc);

create table chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references visitors(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,    -- set when opened via "Inquire with AI"
  started_at timestamptz not null default now(),
  flagged    boolean not null default false,                     -- owner marks a bad answer for tuning
  owner_note text
);
create index chat_sessions_visitor on chat_sessions (visitor_id, started_at desc);

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  visitor_id uuid not null references visitors(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_session on chat_messages (session_id, created_at);

-- ---------- CRM ----------
create table leads (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid references contacts(id) on delete set null,
  visitor_id     uuid references visitors(id) on delete set null,
  name           text not null,
  phone          text not null,                   -- digits only
  business_name  text,
  city           text,
  instagram      text,
  source         lead_source not null,
  stage          lead_stage not null default 'new',
  message        text,
  quoted_amount  numeric(12,2),
  lost_reason    text,
  next_follow_up date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index leads_stage on leads (stage, created_at desc);
create index leads_phone on leads (phone);
-- one OPEN lead per phone number: a repeat enquiry adds to it instead of duplicating
create unique index leads_one_open_per_phone on leads (phone) where stage not in ('won', 'lost');
create index leads_follow_up on leads (next_follow_up) where next_follow_up is not null;
create trigger trg_leads_updated before update on leads
  for each row execute function set_updated_at();

-- the articles a lead asked about (works for the enquiry list: many articles at once)
create table lead_items (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  color_id   uuid references article_colors(id) on delete set null,
  quantity   integer check (quantity > 0),       -- pieces
  note       text,
  created_at timestamptz not null default now()
);
create index lead_items_lead on lead_items (lead_id);
create index lead_items_article on lead_items (article_id);

create table lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  kind       activity_kind not null,
  body       text,
  meta       jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index lead_activities_lead on lead_activities (lead_id, created_at desc);

-- ---------- Owner Inbox: "someone tried to reach us — has anyone responded?" ----------
create table inbox_items (
  id           uuid primary key default gen_random_uuid(),
  kind         inbox_kind not null,
  status       inbox_status not null default 'unanswered',
  name         text,
  phone        text,                              -- digits only; null = visitor left no contact
  visitor_id   uuid references visitors(id) on delete set null,
  lead_id      uuid references leads(id) on delete set null,
  article_id   uuid references articles(id) on delete set null,
  preview      text,
  meta         jsonb not null default '{}',       -- chat session id; later: call provider id, duration
  created_at   timestamptz not null default now(),
  handled_at   timestamptz,
  handled_by   uuid references auth.users(id),
  handled_via  inbox_via,
  handled_note text,
  check (status = 'unanswered' or handled_at is not null)
);
create index inbox_open on inbox_items (created_at desc) where status = 'unanswered';
create index inbox_phone on inbox_items (phone) where phone is not null;
create index inbox_lead on inbox_items (lead_id);

create or replace function handle_inbox_items(p_ids uuid[], p_via inbox_via default 'other', p_note text default null)
returns integer
language plpgsql as $$
declare n integer;
begin
  update inbox_items
     set status = 'handled', handled_at = now(), handled_by = auth.uid(),
         handled_via = p_via, handled_note = p_note
   where id = any(p_ids) and status = 'unanswered';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function handle_inbox_items(uuid[], inbox_via, text) from public, anon;

create view inbox_open_by_contact with (security_invoker = true) as
select
  coalesce(phone, 'anon:' || coalesce(visitor_id::text, id::text)) as contact_key,
  max(name)                              as name,
  max(phone)                             as phone,
  count(*)                               as open_count,
  max(created_at)                        as latest_at,
  min(created_at)                        as oldest_at,
  array_agg(distinct kind)               as kinds,
  array_agg(id order by created_at desc) as item_ids
from inbox_items
where status = 'unanswered'
group by 1;

-- ---------- phone/browser notification registrations ----------
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- AUDIT TRIGGERS
-- =====================================================================
create trigger trg_audit_articles   after insert or update or delete on articles          for each row execute function audit_row();
create trigger trg_audit_brands     after insert or update or delete on brands            for each row execute function audit_row();
create trigger trg_audit_contacts   after insert or update or delete on contacts          for each row execute function audit_row();
create trigger trg_audit_leads      after insert or update or delete on leads             for each row execute function audit_row();
create trigger trg_audit_bills      after insert or update or delete on bills             for each row execute function audit_row();
create trigger trg_audit_settings   after insert or update or delete on business_settings for each row execute function audit_row();
create trigger trg_audit_profiles   after insert or update or delete on profiles          for each row execute function audit_row();
create trigger trg_audit_locations  after insert or update or delete on locations         for each row execute function audit_row();
-- variants: log SKU/threshold/active changes only (stock changes are already in the ledger)
create trigger trg_audit_variants after update on variants for each row
  when (old.sku is distinct from new.sku
     or old.low_stock_threshold is distinct from new.low_stock_threshold
     or old.is_active is distinct from new.is_active)
  execute function audit_row();

-- =====================================================================
-- SECURITY (Row Level Security)
-- =====================================================================
do $$
declare t text;
begin
  -- everything staff-only gets the same rule: active owner/manager can do anything
  foreach t in array array[
    'business_settings','locations','brands','articles','article_colors','article_images','variants',
    'batches','contacts','bills','bill_items','item_aliases','bill_scan_jobs','stock_movements',
    'visitors','visitor_events','chat_sessions','chat_messages','leads','lead_items','lead_activities',
    'inbox_items'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy profiles_admin on profiles for all to authenticated using (is_admin()) with check (is_admin());
create policy profiles_self  on profiles for select to authenticated using (id = auth.uid());

alter table audit_log enable row level security;
create policy audit_read on audit_log for select to authenticated using (is_admin());

alter table push_subscriptions enable row level security;
create policy push_own on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Visitors (anon) have NO direct table access. The website writes visitor/chat/lead data
-- through server code using the service key. Defence in depth: remove default anon grants.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- =====================================================================
-- THE ONLY THINGS THE PUBLIC WEBSITE CAN READ
-- =====================================================================
create view public_settings as
select business_name, tagline, phone, whatsapp, email, address, city, instagram
  from business_settings;

create view public_catalog as
select
  a.id, a.code, a.name, a.category, a.garment, a.style, b.name as brand,
  a.fabric, a.pattern, a.description, a.moq, a.lot_size, a.is_featured, a.created_at,
  -- sizes that still have stock (any colour)
  (select coalesce(jsonb_agg(sz.size order by sz.ord), '[]'::jsonb)
     from (select v.size, min(v.size_order) as ord
             from variants v
            where v.article_id = a.id and v.is_active and v.stock > 0
            group by v.size) sz) as sizes,
  -- colours that still have stock, each with its own photos and in-stock sizes
  (select coalesce(jsonb_agg(jsonb_build_object(
            'id', c.id, 'name', c.name, 'hex', c.hex,
            'sizes', (select coalesce(jsonb_agg(v.size order by v.size_order), '[]'::jsonb)
                        from variants v where v.color_id = c.id and v.is_active and v.stock > 0),
            'images', (select coalesce(jsonb_agg(jsonb_build_object(
                          'thumb', i.thumb_url, 'medium', i.medium_url, 'large', i.url,
                          'blur', i.blur_data_url, 'w', i.width, 'h', i.height) order by i.sort_order), '[]'::jsonb)
                         from article_images i where i.color_id = c.id)
          ) order by c.sort_order), '[]'::jsonb)
     from article_colors c
    where c.article_id = a.id
      and exists (select 1 from variants v where v.color_id = c.id and v.is_active and v.stock > 0)) as colors,
  -- general (not colour-specific) photos
  (select coalesce(jsonb_agg(jsonb_build_object(
            'thumb', i.thumb_url, 'medium', i.medium_url, 'large', i.url,
            'blur', i.blur_data_url, 'w', i.width, 'h', i.height) order by i.sort_order), '[]'::jsonb)
     from article_images i where i.article_id = a.id and i.color_id is null) as images,
  case
    when (select coalesce(sum(v.stock), 0) from variants v where v.article_id = a.id and v.is_active) < a.moq
      then 'low_stock' else 'in_stock'
  end as availability
from articles a
join brands b on b.id = a.brand_id
where a.is_public and a.is_active and b.is_public
  -- out-of-stock articles are not shown at all
  and (select coalesce(sum(v.stock), 0) from variants v where v.article_id = a.id and v.is_active) > 0;

grant select on public_catalog  to anon, authenticated;
grant select on public_settings to anon, authenticated;

-- =====================================================================
-- FILE STORAGE
-- =====================================================================
insert into storage.buckets (id, name, public) values ('article-images', 'article-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('site-media',     'site-media',     true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('bills',          'bills',          false) on conflict (id) do nothing;

create policy "staff manage article images" on storage.objects for all to authenticated
  using (bucket_id = 'article-images' and is_admin()) with check (bucket_id = 'article-images' and is_admin());
create policy "public read article images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'article-images');
create policy "staff manage site media" on storage.objects for all to authenticated
  using (bucket_id = 'site-media' and is_admin()) with check (bucket_id = 'site-media' and is_admin());
create policy "public read site media" on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-media');
create policy "staff manage bills" on storage.objects for all to authenticated
  using (bucket_id = 'bills' and is_admin()) with check (bucket_id = 'bills' and is_admin());

-- =====================================================================
-- LIVE UPDATES (Supabase Realtime): inbox badge, scan progress, new leads
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table inbox_items;
    alter publication supabase_realtime add table bill_scan_jobs;
    alter publication supabase_realtime add table leads;
  end if;
end $$;
