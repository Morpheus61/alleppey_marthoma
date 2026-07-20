-- Migration 029: Grant super_admin to Motty Philip's second number (+918848941943)
-- ============================================================
-- This number logged in for the first time on 2026-07-20.
-- The auth trigger creates a profiles row automatically on first OTP sign-in.
-- This migration ensures that profile is active and has super_admin role.
-- ============================================================

do $$
declare
  v_user_id    uuid;
  v_profile_id uuid;
begin
  -- Locate the auth user created when +918848941943 first signed in
  select id into v_user_id
  from auth.users
  where phone = '918848941943'
  limit 1;

  if v_user_id is null then
    raise exception
      'Auth user for +918848941943 not found. '
      'Ensure the number has completed OTP sign-in at least once.';
  end if;

  -- Ensure a public.profiles row exists and is active
  insert into public.profiles (id, status)
  values (v_user_id, 'active')
  on conflict (id) do update
    set status = 'active';

  v_profile_id := v_user_id;

  -- Grant super_admin (idempotent — safe to run multiple times)
  insert into public.parish_roles (profile_id, role, assigned_by)
  values (v_profile_id, 'super_admin', v_profile_id)
  on conflict (profile_id, role, revoked_at) do nothing;

  raise notice 'super_admin granted to profile % (+918848941943)', v_profile_id;
end $$;
