-- Migration 023: Fix complete_claim — sync full_name and family_members.profile_id
-- ============================================================
-- PROBLEMS with migration 022's complete_claim():
--
-- 1. profiles.full_name was never set — new accounts have full_name='' by default.
--    After auto-approve, profiles.full_name remains '', which crashes any UI
--    that does full_name[0].toUpperCase() (RegistrySearch, ProfileCard, ClaimFlow).
--
-- 2. family_members.profile_id was never updated — the registry "unlinked" check
--    reads family_members.profile_id, so auto-approved users stayed in the
--    "unlinked members" panel. Also my_family_ids() uses profile_id, so the
--    user couldn't read their own family_members rows via RLS.
--
-- FIX: Replace complete_claim() to also:
--   • copy full_name / full_name_ml from family_members into profiles
--   • set family_members.profile_id = auth.uid()
--
-- DATA FIX: Backfill any existing rows that were claimed via the old function.
-- ============================================================

create or replace function public.complete_claim(
  p_family_member_id uuid,
  p_auto_approve     boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name    text;
  v_full_name_ml text;
begin
  -- Re-verify the member is still unclaimed (race-condition guard)
  select full_name, full_name_ml
    into v_full_name, v_full_name_ml
  from   public.family_members
  where  id = p_family_member_id
    and  not exists (
           select 1 from public.profiles
           where  family_member_id = p_family_member_id
         );

  if not found then
    raise exception 'Registry person not found or already claimed';
  end if;

  -- Update the profile — bypasses the status-lock RLS WITH CHECK
  -- Also sets full_name / full_name_ml from the registry record
  update public.profiles
  set
    family_member_id = p_family_member_id,
    display_name     = v_full_name,
    full_name        = v_full_name,
    full_name_ml     = v_full_name_ml,
    claim_status     = case when p_auto_approve then 'approved'      else 'pending_claim' end,
    status           = case when p_auto_approve then 'active'        else 'pending'       end
  where  id           = auth.uid()
    and  claim_status = 'unclaimed';

  if not found then
    raise exception 'Claim could not be applied — profile already processed';
  end if;

  -- Keep family_members.profile_id in sync so my_family_ids() and the
  -- registry unlinked-accounts check both see the connection immediately
  update public.family_members
  set    profile_id = auth.uid()
  where  id = p_family_member_id;
end;
$$;

-- ── Data backfill ────────────────────────────────────────────
-- Fix profiles that were claimed via the old function (full_name still empty)
update public.profiles p
set
  full_name    = fm.full_name,
  full_name_ml = fm.full_name_ml,
  display_name = fm.full_name
from public.family_members fm
where p.family_member_id = fm.id
  and (p.full_name is null or p.full_name = '');

-- Fix family_members.profile_id where profiles.family_member_id was set
-- but family_members.profile_id was never backfilled
update public.family_members fm
set    profile_id = p.id
from   public.profiles p
where  p.family_member_id = fm.id
  and  fm.profile_id is null;
