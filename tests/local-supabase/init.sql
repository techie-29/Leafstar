-- Prepares an EMPTY Postgres database to behave like a Supabase project for local and CI tests:
-- the Supabase roles, the auth schema owned by the auth server, a minimal storage schema, and
-- Supabase's default grants (which 003_hardening.sql then tightens for anon).
-- Run as a superuser, before the auth server's own migrations and before schema.sql.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'local-only'; end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin login createrole password 'local-only'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

create schema if not exists auth authorization supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema auth to anon, authenticated, service_role;
do $$ begin execute format('grant create on database %I to supabase_auth_admin', current_database()); end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Storage: only the parts schema.sql touches (buckets and object policies). Real uploads are not tested here.
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
