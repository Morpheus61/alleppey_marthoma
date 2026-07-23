-- Migration 037: Fix South Ward Prayer Group leader + correct profile name

-- ── DIAGNOSTIC CONFIRMED ───────────────────────────────────────────────────
-- Profile id   : e01ddae1-7f84-4b63-a876-4a206d9d87a6
-- Phone        : 919645815123  (George.V.Cherian — Son, South Ward family)
-- Stored name  : "V E George"  ← was incorrectly set when account was linked
-- Fix          : rename profile to "George V Cherian" AND set as group convenor
-- ──────────────────────────────────────────────────────────────────────────

do $$
declare
  v_profile_id   constant uuid := 'e01ddae1-7f84-4b63-a876-4a206d9d87a6';
  v_group_id     uuid;
  v_old_leader_id   uuid;
  v_old_leader_name text;
begin
  -- ── 1. Correct the profile name ──────────────────────────────────────────
  update public.profiles
  set full_name    = 'George V Cherian',
      full_name_ml = 'ജോർജ് വി ചെറിയൻ'
  where id = v_profile_id;

  raise notice 'Profile name corrected to: George V Cherian';

  -- ── 2. Get the South Ward Prayer Group ───────────────────────────────────
  select id into v_group_id
  from public.groups
  where slug = 'south-ward-prayer-group'
     or name ilike '%South Ward Prayer Group%'
     or name ilike '%Thekku%'
  limit 1;

  if v_group_id is null then
    raise exception 'South Ward / Thekku Prayer Group not found';
  end if;

  -- ── 3. Demote any existing leaders in this group ─────────────────────────
  for v_old_leader_id, v_old_leader_name in
    select gm.user_id, p.full_name
    from public.group_memberships gm
    join public.profiles p on p.id = gm.user_id
    where gm.group_id = v_group_id
      and gm.role     = 'leader'
  loop
    raise notice 'Demoting existing leader: % (id: %)', v_old_leader_name, v_old_leader_id;
    update public.group_memberships
    set role = 'member'
    where group_id = v_group_id
      and user_id  = v_old_leader_id;
  end loop;

  -- ── 4. Set George V Cherian as leader ────────────────────────────────────
  insert into public.group_memberships (group_id, user_id, role, status)
  values (v_group_id, v_profile_id, 'leader', 'active')
  on conflict (group_id, user_id) do update
    set role   = 'leader',
        status = 'active';

  raise notice 'Done — South Ward Prayer Group convenor set to George V Cherian';
end;
$$;
