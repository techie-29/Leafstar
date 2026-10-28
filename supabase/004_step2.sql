-- =====================================================================
-- LEAF STAR  ·  004_step2.sql
-- Run ONCE in the Supabase SQL Editor, AFTER 003_hardening.sql (in the real project and in
-- leafstar-test). Single transaction: if anything fails, nothing is applied.
--
-- 1. Two-step login, enforced by the database. Once a staff member has switched on two-step login
-- (a verified authenticator app), their password alone no longer opens ANY data: every admin rule
-- also requires the session to have passed the second step (Supabase marks it "aal2").
-- Without this, someone with only the password could skip the app's code screen and call the
-- database API directly.
-- =====================================================================
begin;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from profiles
            where id = auth.uid() and is_active and role in ('owner', 'manager')
         )
     and (
           coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
           or not exists (
                select 1 from auth.mfa_factors f
                 where f.user_id = auth.uid() and f.status = 'verified'
              )
         );
$$;

-- 2. Brand names are unique whatever the capitals: "Leaf Star" and "leaf star" are the same brand.
create unique index brands_name_unique_ci on brands (lower(name));

commit;
