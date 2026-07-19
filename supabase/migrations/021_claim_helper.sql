-- Migration 021: Fix claim flow for pending/unclaimed users
-- ============================================================
-- PROBLEM: claimFamilyMember() server action does a direct SELECT on
-- family_members to validate the member and check phone for auto-approval.
-- RLS on family_members only allows reads for:
--   • super_admin / admin
--   • members whose profile_id is already linked (my_family_ids())
-- A pending/unclaimed user has no linked family_member row yet, so the
-- SELECT returns null → "Registry person not found" error.
--
-- FIX: Add a security-definer helper function that returns the id, full_name,
-- and phone of a specific family_member *only if it is unclaimed*.
-- This mirrors the existing household_claimable_members() RPC approach.
-- ============================================================

create or replace function public.get_family_member_for_claim(p_id uuid)
returns table(
  id           uuid,
  full_name    text,
  phone        text
)
language sql security definer stable
set search_path = public
as $$
  select fm.id,
         fm.full_name,
         fm.phone
  from   public.family_members fm
  where  fm.id = p_id
    and  not exists (
           select 1 from public.profiles p
           where  p.family_member_id = fm.id
         );
$$;
