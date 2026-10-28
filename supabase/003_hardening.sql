-- =====================================================================
-- LEAF STAR  ·  003_hardening.sql
-- Run ONCE in the Supabase SQL Editor, AFTER schema.sql. Safe to run on a database
-- that already has data. Runs as a single transaction: if anything fails, nothing is applied.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Public file listing closed. Public buckets still serve a photo to anyone who has its
--    link; these two policies only let strangers LIST every file, which could reveal
--    photos of hidden brands. Staff keep full access through their own policies.
-- ---------------------------------------------------------------------
drop policy if exists "public read article images" on storage.objects;
drop policy if exists "public read site media"     on storage.objects;

-- ---------------------------------------------------------------------
-- 2. Future tables are closed to the public by default (no one has to remember).
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ---------------------------------------------------------------------
-- 3. Deleting a colour deletes that colour's photos (they no longer fall into the
--    general gallery by accident).
-- ---------------------------------------------------------------------
alter table article_images drop constraint if exists article_images_color_id_fkey;
alter table article_images
  add constraint article_images_color_id_fkey
  foreign key (color_id) references article_colors(id) on delete cascade;

-- ---------------------------------------------------------------------
-- 4. Publishing rule enforced by the database: an article can go public only if it has
--    at least one colour and every colour has at least one photo.
-- ---------------------------------------------------------------------
create or replace function enforce_publish_rules() returns trigger
language plpgsql as $$
begin
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    if tg_op = 'INSERT' then
      raise exception 'Create the article first, then publish it once it has colours and photos';
    end if;
    if not exists (select 1 from article_colors where article_id = new.id) then
      raise exception 'Add at least one colour before publishing';
    end if;
    if exists (
      select 1 from article_colors c
       where c.article_id = new.id
         and not exists (select 1 from article_images i where i.color_id = c.id)
    ) then
      raise exception 'Every colour needs at least one photo before the article can be published';
    end if;
  end if;
  return new;
end $$;
create trigger trg_articles_publish_rules before insert or update on articles
  for each row execute function enforce_publish_rules();

-- ---------------------------------------------------------------------
-- 5. Undo for manual stock entries. A movement can be reversed exactly once, by the
--    database itself (not just by the screen).
-- ---------------------------------------------------------------------
create unique index if not exists stock_movements_reversed_once
  on stock_movements (reverses_movement_id) where reverses_movement_id is not null;

create or replace function undo_movement(p_movement_id uuid, p_note text default null) returns uuid
language plpgsql as $$
declare m stock_movements%rowtype; new_id uuid;
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  select * into m from stock_movements where id = p_movement_id for update;
  if not found then raise exception 'Stock entry not found'; end if;
  if m.bill_id is not null then
    raise exception 'This entry belongs to a bill. Undo the bill instead';
  end if;
  if m.reason not in ('production', 'adjustment', 'opening', 'return') then
    raise exception 'Only manual stock entries can be undone here';
  end if;
  if m.reverses_movement_id is not null then
    raise exception 'This entry is already an undo';
  end if;
  if exists (select 1 from stock_movements where reverses_movement_id = m.id) then
    raise exception 'This entry was already undone';
  end if;
  insert into stock_movements (variant_id, location_id, qty_change, reason, batch_id,
                               reverses_movement_id, note, created_by)
  values (m.variant_id, m.location_id, -m.qty_change, 'undo', m.batch_id, m.id,
          coalesce(nullif(trim(p_note), ''), 'Undo of manual entry'), auth.uid())
  returning id into new_id;
  return new_id;
end $$;
revoke execute on function undo_movement(uuid, text) from public, anon;

-- ---------------------------------------------------------------------
-- 6. Stock entry as ONE transaction (the screen sends one call; all or nothing)
-- ---------------------------------------------------------------------
create or replace function size_rank(p_size text, p_pos integer) returns integer
language sql immutable as $$
  select case upper(p_size)
           when 'S' then 1 when 'M' then 2 when 'L' then 3 when 'XL' then 4 when 'XXL' then 5
           else 10 + p_pos end
$$;

-- New article: article + colours + sizes (variants) + photos + batch + opening production stock.
-- p = { article:{code,name,category,garment,style,brand_id,fabric,pattern,description,moq,
--                lot_size,hsn_code,is_public,is_featured},
--       sizes:["S","M"],
--       colors:[{name,code,hex,images:[{thumb_url,medium_url,url,blur_data_url,width,height}],
--                stock:{"S":10,"M":20}}],
--       images:[ ...general photos... ],
--       batch:{code,produced_on,notes} }
create or replace function create_article_full(p jsonb) returns uuid
language plpgsql as $$
declare
  a jsonb := p -> 'article';
  aid uuid; cid uuid; vid uuid; bid uuid;
  col jsonb; img jsonb; sz text;
  ci integer := 0; si integer; qty integer;
  want_public boolean := coalesce((p -> 'article' ->> 'is_public')::boolean, false);
  acode text := upper(trim(a ->> 'code'));
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  if jsonb_typeof(p -> 'sizes') is distinct from 'array' or jsonb_array_length(p -> 'sizes') = 0 then
    raise exception 'Choose at least one size';
  end if;
  if jsonb_typeof(p -> 'colors') is distinct from 'array' or jsonb_array_length(p -> 'colors') = 0 then
    raise exception 'Add at least one colour';
  end if;

  insert into articles (code, name, category, garment, style, brand_id, fabric, pattern, description,
                        moq, lot_size, hsn_code, is_public, is_featured)
  values (acode, a ->> 'name', (a ->> 'category')::article_category, a ->> 'garment', a ->> 'style',
          (a ->> 'brand_id')::uuid, a ->> 'fabric', a ->> 'pattern', a ->> 'description',
          coalesce((a ->> 'moq')::integer, 50), nullif(a ->> 'lot_size', '')::integer, a ->> 'hsn_code',
          false, coalesce((a ->> 'is_featured')::boolean, false))
  returning id into aid;

  if p ? 'batch' and jsonb_typeof(p -> 'batch') = 'object' then
    insert into batches (code, produced_on, notes)
    values (p -> 'batch' ->> 'code',
            coalesce((p -> 'batch' ->> 'produced_on')::date, current_date),
            p -> 'batch' ->> 'notes')
    returning id into bid;
  end if;

  for col in select * from jsonb_array_elements(p -> 'colors') loop
    insert into article_colors (article_id, name, code, hex, sort_order)
    values (aid, trim(col ->> 'name'), upper(trim(col ->> 'code')), col ->> 'hex', ci)
    returning id into cid;
    ci := ci + 1;

    for img in select * from jsonb_array_elements(coalesce(col -> 'images', '[]'::jsonb)) loop
      insert into article_images (article_id, color_id, thumb_url, medium_url, url, blur_data_url, width, height, sort_order)
      values (aid, cid, img ->> 'thumb_url', img ->> 'medium_url', img ->> 'url', img ->> 'blur_data_url',
              nullif(img ->> 'width', '')::integer, nullif(img ->> 'height', '')::integer,
              coalesce((select max(sort_order) + 1 from article_images where color_id = cid), 0));
    end loop;

    si := 0;
    for sz in select jsonb_array_elements_text(p -> 'sizes') loop
      insert into variants (article_id, color_id, size, size_order, sku)
      values (aid, cid, upper(trim(sz)), size_rank(sz, si), upper(acode || '-' || (col ->> 'code') || '-' || trim(sz)))
      returning id into vid;
      si := si + 1;

      qty := coalesce(nullif(col -> 'stock' ->> upper(trim(sz)), '')::integer, 0);
      if qty < 0 then raise exception 'Stock cannot be negative'; end if;
      if qty > 0 then
        insert into stock_movements (variant_id, qty_change, reason, batch_id, created_by, note)
        values (vid, qty, case when bid is null then 'opening'::movement_reason else 'production'::movement_reason end,
                bid, auth.uid(), case when bid is null then 'Opening stock' end);
      end if;
    end loop;
  end loop;

  for img in select * from jsonb_array_elements(coalesce(p -> 'images', '[]'::jsonb)) loop
    insert into article_images (article_id, color_id, thumb_url, medium_url, url, blur_data_url, width, height, sort_order)
    values (aid, null, img ->> 'thumb_url', img ->> 'medium_url', img ->> 'url', img ->> 'blur_data_url',
            nullif(img ->> 'width', '')::integer, nullif(img ->> 'height', '')::integer,
            coalesce((select max(sort_order) + 1 from article_images where article_id = aid and color_id is null), 0));
  end loop;

  if want_public then
    update articles set is_public = true where id = aid;   -- the publish rules run here
  end if;
  return aid;
end $$;
revoke execute on function create_article_full(jsonb) from public, anon;

-- Add stock to existing articles: one batch + many production entries, all or nothing.
-- p = { batch:{code,produced_on,notes}, rows:[{variant_id, qty}] }
create or replace function add_stock_batch(p jsonb) returns uuid
language plpgsql as $$
declare bid uuid; r jsonb; q integer;
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(p -> 'batch' ->> 'code'), '') = '' then raise exception 'A batch code is required'; end if;
  if jsonb_typeof(p -> 'rows') is distinct from 'array' or jsonb_array_length(p -> 'rows') = 0 then
    raise exception 'Enter at least one quantity';
  end if;
  insert into batches (code, produced_on, notes)
  values (trim(p -> 'batch' ->> 'code'), coalesce((p -> 'batch' ->> 'produced_on')::date, current_date), p -> 'batch' ->> 'notes')
  returning id into bid;
  for r in select * from jsonb_array_elements(p -> 'rows') loop
    q := (r ->> 'qty')::integer;
    if q is null or q <= 0 then raise exception 'Quantities must be positive whole numbers'; end if;
    insert into stock_movements (variant_id, qty_change, reason, batch_id, created_by)
    values ((r ->> 'variant_id')::uuid, q, 'production', bid, auth.uid());
  end loop;
  return bid;
end $$;
revoke execute on function add_stock_batch(jsonb) from public, anon;

-- ---------------------------------------------------------------------
-- 7. Rate limiting kept in the database (works on serverless hosting)
-- ---------------------------------------------------------------------
create table rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;   -- no policies: only server code with the service key

-- true = allowed, false = over the limit. Fixed time windows.
create or replace function rate_limit_allow(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql as $$
declare ws timestamptz; c integer;
begin
  ws := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (key, window_start, hits) values (p_key, ws, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into c;
  return c <= p_limit;
end $$;

create or replace function purge_rate_limits() returns integer
language plpgsql as $$
declare n integer;
begin
  delete from rate_limits where window_start < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function rate_limit_allow(text, integer, integer) from public, anon, authenticated;
revoke execute on function purge_rate_limits() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Bill scan jobs: stuck jobs recover on their own
-- ---------------------------------------------------------------------
create or replace function reset_stuck_scan_jobs(p_minutes integer default 10, p_max_attempts integer default 3) returns integer
language plpgsql as $$
declare n integer;
begin
  update bill_scan_jobs
     set status = case when attempts >= p_max_attempts then 'failed'::scan_status else 'queued'::scan_status end,
         error  = case when attempts >= p_max_attempts then 'Stopped after repeated attempts. Press Retry.' else error end,
         finished_at = case when attempts >= p_max_attempts then now() else finished_at end
   where status = 'processing' and started_at < now() - make_interval(mins => p_minutes);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function reset_stuck_scan_jobs(integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. Gemini usage log, daily budget and a pause switch
-- ---------------------------------------------------------------------
alter table business_settings
  add column ai_daily_token_budget bigint  not null default 2000000 check (ai_daily_token_budget >= 0),
  add column ai_paused             boolean not null default false;

create table ai_usage (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  feature       text not null check (feature in ('bill_scan', 'chat', 'other')),
  model         text,
  input_tokens  integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  ok            boolean not null default true,
  error         text,
  ref_id        uuid                       -- scan job or chat session
);
create index ai_usage_created on ai_usage (created_at desc);
alter table ai_usage enable row level security;
create policy admin_read on ai_usage for select to authenticated using (is_admin());

create view ai_usage_daily with (security_invoker = true) as
select (created_at at time zone 'Asia/Kolkata')::date as day,
       feature,
       count(*)::int                                   as calls,
       count(*) filter (where not ok)::int             as failures,
       (sum(input_tokens) + sum(output_tokens))::bigint as tokens
  from ai_usage
 group by 1, 2;

-- true when AI may be used right now (not paused, and today's tokens are under the budget; India time)
create or replace function ai_allowed() returns boolean
language sql stable as $$
  select not s.ai_paused
     and coalesce((select sum(input_tokens + output_tokens) from ai_usage
                    where (created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date), 0)
         < s.ai_daily_token_budget
    from business_settings s
$$;
revoke execute on function ai_allowed() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Owner-supplied FAQ / policies for the chatbot, and what it could not answer
-- ---------------------------------------------------------------------
create table faq_entries (
  id         uuid primary key default gen_random_uuid(),
  topic      text,
  question   text not null,
  answer     text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_faq_updated before update on faq_entries
  for each row execute function set_updated_at();

create table unanswered_questions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete set null,
  visitor_id uuid references visitors(id) on delete set null,
  question   text not null,
  status     text not null default 'open' check (status in ('open', 'resolved')),
  faq_id     uuid references faq_entries(id) on delete set null,
  created_at timestamptz not null default now()
);
create index unanswered_open on unanswered_questions (created_at desc) where status = 'open';

alter table faq_entries          enable row level security;
alter table unanswered_questions enable row level security;
create policy admin_all on faq_entries          for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on unanswered_questions for all to authenticated using (is_admin()) with check (is_admin());

commit;
