-- Migration 038: Durable Convenor Designation
-- ============================================================
-- Problem: group_memberships.role='leader' is set by the admin but can be
-- lost if the sync trigger re-fires (e.g. family moves groups, member
-- re-linked). There is no persistent record of "who IS the convenor".
--
-- Fix:
--   1. Add groups.convenor_id (FK → profiles) as the authoritative record.
--   2. Backfill from existing group_memberships leaders.
--   3. Update sync_ward_membership trigger to restore leader role for the
--      convenor whenever members are re-synced.
--   4. Add trigger on family_members to auto-add newly-linked profiles to
--      their family's prayer group (fills the gap where new account links
--      were not picked up before).
-- ============================================================


-- ── 1. Add convenor_id to groups ─────────────────────────────
alter table public.groups
  add column if not exists convenor_id uuid references public.profiles(id) on delete set null;

comment on column public.groups.convenor_id is
  'The designated convenor/leader for this group. Source of truth — independent of group_memberships sync.';


-- ── 2. Backfill convenor_id from existing leader memberships ─
-- For each group, if exactly one leader exists use them; if multiple exist,
-- pick the one with the earliest joined_at (first appointed).
update public.groups g
set convenor_id = (
  select gm.user_id
  from public.group_memberships gm
  where gm.group_id  = g.id
    and gm.role      = 'leader'
    and gm.status    = 'active'
  order by gm.joined_at
  limit 1
)
where exists (
  select 1 from public.group_memberships gm2
  where gm2.group_id = g.id
    and gm2.role     = 'leader'
    and gm2.status   = 'active'
);


-- ── 3. Updated sync_ward_membership trigger ──────────────────
-- Changes vs migration 018:
--   a) on conflict: also explicitly preserves role (was implicit; now explicit).
--   b) After the upsert loop, re-elevate the convenor to 'leader' if they are
--      a member of this family and are in the group (covers re-sync + fresh
--      insert after deletion).
--   c) If convenor_id is not yet in the group (e.g. their row was deleted),
--      insert them fresh as 'leader'.
create or replace function public.sync_ward_membership()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_convenor_id uuid;
begin
  -- ── A. Remove old ward memberships when prayer group changes (NULL-safe) ──
  if TG_OP = 'UPDATE' and (old.prayer_group_id IS DISTINCT FROM new.prayer_group_id) then
    if old.prayer_group_id is not null then
      delete from group_memberships gm
      using family_members fm
      where fm.family_id = new.id
        and fm.profile_id is not null
        and gm.user_id = fm.profile_id
        and gm.group_id = old.prayer_group_id
        and gm.status   = 'active';
    end if;
  end if;

  -- ── B. Upsert all living linked family members as 'member' ────────────────
  if new.prayer_group_id is not null then
    insert into group_memberships (group_id, user_id, role, status, joined_at)
    select new.prayer_group_id, fm.profile_id, 'member', 'active', now()
    from family_members fm
    where fm.family_id    = new.id
      and fm.profile_id  is not null
      and not fm.is_deceased
    on conflict (group_id, user_id) do update
      set status = 'active',
          -- Preserve leader role — never downgrade an existing leader to member
          role   = case
                     when group_memberships.role = 'leader' then 'leader'
                     else excluded.role
                   end;

    -- ── C. Restore / ensure convenor has role='leader' ───────────────────────
    -- Look up this group's designated convenor.
    select convenor_id into v_convenor_id
    from public.groups
    where id = new.prayer_group_id;

    if v_convenor_id is not null then
      -- If convenor is a living member of this family, ensure they are leader.
      -- This handles the case where their row was deleted and just re-inserted.
      if exists (
        select 1 from family_members fm
        where fm.family_id  = new.id
          and fm.profile_id = v_convenor_id
          and not fm.is_deceased
      ) then
        insert into group_memberships (group_id, user_id, role, status, joined_at)
        values (new.prayer_group_id, v_convenor_id, 'leader', 'active', now())
        on conflict (group_id, user_id) do update
          set role   = 'leader',
              status = 'active';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Re-create trigger (replaces the one from migration 018)
drop trigger if exists trg_sync_ward_membership on public.family_units;
create trigger trg_sync_ward_membership
  after insert or update of prayer_group_id on public.family_units
  for each row execute function public.sync_ward_membership();


-- ── 4. New trigger: auto-add newly-linked profile to prayer group ─────────
-- When a family_member gets their profile_id set (account linked), add them
-- to the family's prayer group automatically.
create or replace function public.sync_new_member_to_ward()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_prayer_group_id uuid;
  v_convenor_id     uuid;
begin
  -- Only act when profile_id is being set (new link) and person is not deceased
  if new.profile_id is null then
    return new;
  end if;
  if new.is_deceased then
    return new;
  end if;

  -- Get the family's prayer group
  select prayer_group_id into v_prayer_group_id
  from public.family_units
  where id = new.family_id;

  if v_prayer_group_id is null then
    return new;
  end if;

  -- Determine role: member by default, leader if they are the group convenor
  select convenor_id into v_convenor_id
  from public.groups
  where id = v_prayer_group_id;

  insert into public.group_memberships (group_id, user_id, role, status, joined_at)
  values (
    v_prayer_group_id,
    new.profile_id,
    case when v_convenor_id = new.profile_id then 'leader' else 'member' end,
    'active',
    now()
  )
  on conflict (group_id, user_id) do update
    set status = 'active',
        role   = case
                   when v_convenor_id = group_memberships.user_id then 'leader'
                   when group_memberships.role = 'leader'         then 'leader'
                   else 'member'
                 end;

  return new;
end;
$$;

drop trigger if exists trg_sync_new_member_to_ward on public.family_members;
create trigger trg_sync_new_member_to_ward
  after insert or update of profile_id on public.family_members
  for each row execute function public.sync_new_member_to_ward();


-- ── 5. RLS: allow admins to update convenor_id ───────────────────────────
-- groups table already has an admin update policy; this column is covered.
-- (No new policy needed.)


-- ── 6. Verify backfill ────────────────────────────────────────
-- Run this as a sanity check after applying the migration:
-- select g.name, p.full_name as convenor
-- from public.groups g
-- left join public.profiles p on p.id = g.convenor_id
-- order by g.name;
