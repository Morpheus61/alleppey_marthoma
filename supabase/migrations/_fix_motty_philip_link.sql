-- ============================================================
-- DIAGNOSTIC: Run Step 1 first to confirm the UUIDs, then Step 2 to fix.
-- ============================================================

-- STEP 1: See the current state (run this first)
-- ============================================================
select
  p.id            as profile_id,
  p.full_name,
  p.family_member_id,
  p.claim_status,
  fm.id           as family_member_record_id,
  fm.profile_id   as fm_profile_id,
  fu.house_name
from public.profiles p
left join public.family_members fm on fm.full_name ilike '%' || split_part(p.full_name, ' ', 1) || '%'
left join public.family_units fu   on fu.id = fm.family_id
where p.full_name ilike '%Motty%'
   or p.full_name ilike '%Philip%';


-- STEP 2: Fix — link profile to family member (run AFTER confirming Step 1 results)
-- ============================================================
-- This does both directions at once:
--   a) profiles.family_member_id → fm.id
--   b) family_members.profile_id → profile.id

do $$
declare
  v_profile_id     uuid;
  v_family_member_id uuid;
begin
  -- Get Motty Philip's profile UUID
  select id into v_profile_id
  from public.profiles
  where full_name ilike '%Motty Philip%'
  limit 1;

  if v_profile_id is null then
    raise exception 'Profile not found for Motty Philip';
  end if;

  -- Get the family_member record from the Pandampurath household
  select fm.id into v_family_member_id
  from public.family_members fm
  join public.family_units fu on fu.id = fm.family_id
  where fu.house_name ilike '%Pandampurath%'
    and fm.full_name ilike '%Motty%'
  limit 1;

  if v_family_member_id is null then
    raise exception 'Family member record not found in Pandampurath household';
  end if;

  -- 1. Set family_members.profile_id
  update public.family_members
  set profile_id = v_profile_id
  where id = v_family_member_id;

  -- 2. Set profiles.family_member_id + claim_status
  update public.profiles
  set family_member_id = v_family_member_id,
      claim_status     = 'approved'
  where id = v_profile_id;

  raise notice 'Linked: profile % → family_member %', v_profile_id, v_family_member_id;
end;
$$;


-- STEP 3: Verify the fix worked
-- ============================================================
select
  p.id            as profile_id,
  p.full_name,
  p.family_member_id,
  p.claim_status,
  fm.id           as family_member_record_id,
  fm.profile_id   as fm_profile_id,
  fu.house_name
from public.profiles p
join public.family_members fm on fm.id = p.family_member_id
join public.family_units fu   on fu.id = fm.family_id
where p.full_name ilike '%Motty%';
