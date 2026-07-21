-- Migration 030: Copy house_name from family_units when a user claims a registry member
-- ============================================================
-- PROBLEM: complete_claim() copies full_name/full_name_ml from family_members but
-- never fetches house_name from the parent family_units row, leaving profiles.house_name NULL.
-- This was observed for Sherine Motty (Pandampurath) after auto-approval.
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
  v_house_name   text;
begin
  -- Re-verify the member is still unclaimed (race-condition guard)
  -- Also JOIN family_units to grab house_name in one query
  select fm.full_name, fm.full_name_ml, fu.house_name
    into v_full_name, v_full_name_ml, v_house_name
  from   public.family_members fm
  join   public.family_units   fu on fu.id = fm.family_id
  where  fm.id = p_family_member_id
    and  not exists (
           select 1 from public.profiles
           where  family_member_id = p_family_member_id
         );

  if not found then
    raise exception 'Registry person not found or already claimed';
  end if;

  -- Update the profile — bypasses the status-lock RLS WITH CHECK
  -- Copies full_name / full_name_ml / house_name from the registry record
  update public.profiles
  set
    family_member_id = p_family_member_id,
    display_name     = v_full_name,
    full_name        = v_full_name,
    full_name_ml     = v_full_name_ml,
    house_name       = v_house_name,
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
-- Fix profiles that are already claimed/approved but have house_name = NULL
-- because they went through the old complete_claim without the house_name copy.
update public.profiles p
set    house_name = fu.house_name
from   public.family_members fm
join   public.family_units   fu on fu.id = fm.family_id
where  p.family_member_id = fm.id
  and  p.house_name is null
  and  p.claim_status in ('approved', 'pending_claim');
