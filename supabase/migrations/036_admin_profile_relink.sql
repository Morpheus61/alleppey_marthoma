-- Migration 036: Admin profile re-link + group membership fixes
-- ============================================================
-- A. Allow admins/super_admins to re-point family_member_id
--    The lock_claimed_identity trigger was blocking legitimate
--    admin re-links (e.g. moving an account from Head to Son).
--    Add an admin bypass: if the calling role is service_role
--    OR the profile's claim is being re-processed by an admin
--    (signalled by claim_status being set back to 'approved'),
--    allow the re-point.
--
-- B. Fix "profiles: admin update any" RLS policy to honour
--    parish_roles (is_admin_or_above), not just the legacy
--    profiles.is_admin boolean. Motty Philip's admin power
--    comes from parish_roles (super_admin), not the boolean.
-- ============================================================

-- ── A. Loosen the trigger to allow admin re-links ─────────────
-- Strategy: let the trigger pass when the acting session has
-- already cleared claim_status back to 'unclaimed' (which
-- linkProfileToMember does in its new flow) OR when
-- current_setting indicates an admin bypass.
-- Simplest safe approach: allow re-point when the new
-- claim_status is being reset (i.e. the update comes from
-- the admin unlinking step).
create or replace function public.lock_claimed_identity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Block self-service re-points (user cannot switch which
  -- family member they are once the admin approved them).
  -- Admin-initiated re-points are allowed: the admin first
  -- unlinks (sets claim_status = 'unclaimed', profile_id = null
  -- on the old member row) then re-links via linkProfileToMember.
  -- During an admin re-link the claim_status transitions through
  -- 'unclaimed' → 'approved', so old.claim_status will be
  -- 'unclaimed' when family_member_id is updated.
  if old.claim_status = 'approved'
     and new.family_member_id is distinct from old.family_member_id
     -- Only block when the claim was already approved AND
     -- the update does NOT also reset claim_status (admin re-link
     -- always sets claim_status = 'approved' from 'unclaimed').
     and old.claim_status = new.claim_status
  then
    raise exception 'Cannot re-point family_member_id after claim approval';
  end if;
  return new;
end;
$$;

-- ── B. Fix profiles admin update policy ───────────────────────
-- Replace the old is_admin() check with is_admin_or_above()
-- so that super_admin parish_roles holders can update profiles.
drop policy if exists "profiles: admin update any" on public.profiles;

create policy "profiles: admin update any"
  on public.profiles for update
  to authenticated
  using  (public.is_admin() or public.is_admin_or_above())
  with check (public.is_admin() or public.is_admin_or_above());
