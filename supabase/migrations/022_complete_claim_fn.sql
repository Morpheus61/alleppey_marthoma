-- Migration 022: Security-definer function to complete the identity claim
-- ============================================================
-- PROBLEM: claimFamilyMember() updates profiles directly, but the RLS
-- "profiles: update own" WITH CHECK clause prevents changing the status
-- column:
--   and status = (select status from public.profiles where id = auth.uid())
-- For auto-approved claims (phone match) the action sets status='active'
-- from status='pending', which fails the WITH CHECK.
--
-- FIX: A security-definer function complete_claim() that bypasses RLS and
-- performs the atomic profile update + race-condition guard in one call.
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
  v_display_name text;
begin
  -- Re-verify the member is still unclaimed (race-condition guard)
  select full_name into v_display_name
  from   public.family_members
  where  id = p_family_member_id
    and  not exists (
           select 1 from public.profiles
           where  family_member_id = p_family_member_id
         );

  if not found then
    raise exception 'Registry person not found or already claimed';
  end if;

  -- Apply the claim — bypasses the status-lock in the RLS WITH CHECK
  update public.profiles
  set
    family_member_id = p_family_member_id,
    display_name     = v_display_name,
    claim_status     = case when p_auto_approve then 'approved'      else 'pending_claim' end,
    status           = case when p_auto_approve then 'active'        else 'pending'       end
  where  id           = auth.uid()
    and  claim_status = 'unclaimed';   -- extra guard against double-claim

  if not found then
    raise exception 'Claim could not be applied — profile already processed';
  end if;
end;
$$;
