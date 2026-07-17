-- Migration 018: Fix prayer-group trigger + Special Prayer Meeting template
-- ============================================================

-- ── 1. FIX: sync_ward_membership trigger (NULL-safe comparison) ──────────
-- Old code used `old.prayer_group_id <> new.prayer_group_id` which evaluates
-- to NULL (not TRUE) in PostgreSQL when either side is NULL, so stale ward
-- memberships were never deleted when a family moved between bhagams.
-- Fix: use IS DISTINCT FROM which handles NULLs correctly.
create or replace function public.sync_ward_membership()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Remove old ward memberships when prayer group changes (NULL-safe)
  if TG_OP = 'UPDATE' and (old.prayer_group_id IS DISTINCT FROM new.prayer_group_id) then
    -- Remove old bhagam membership for all profiles in this family
    if old.prayer_group_id is not null then
      delete from group_memberships gm
      using family_members fm
      where fm.family_id = new.id
        and fm.profile_id is not null
        and gm.user_id = fm.profile_id
        and gm.group_id = old.prayer_group_id
        and gm.status = 'active';
    end if;
  end if;

  -- Insert/restore ward membership for all linked profiles
  if new.prayer_group_id is not null then
    insert into group_memberships (group_id, user_id, role, status, joined_at)
    select new.prayer_group_id, fm.profile_id, 'member', 'active', now()
    from family_members fm
    where fm.family_id = new.id
      and fm.profile_id is not null
      and not fm.is_deceased
    on conflict (group_id, user_id) do update
      set status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_ward_membership on public.family_units;
create trigger trg_sync_ward_membership
  after insert or update of prayer_group_id on public.family_units
  for each row execute function public.sync_ward_membership();

-- ── 2. DATA CLEANUP: Remove stale prayer-group memberships ───────────────
-- For each profile, keep only the prayer group that matches their current
-- family_unit.prayer_group_id assignment. Remove any others.
delete from group_memberships gm
where exists (
  select 1 from groups g where g.id = gm.group_id and g.group_type = 'prayer'
)
and not exists (
  select 1
  from family_members fm
  join family_units fu on fu.id = fm.family_id
  where fm.profile_id = gm.user_id
    and fu.prayer_group_id = gm.group_id
    and not fm.is_deceased
);

-- ── 3. event_templates: ensure requires_host_family is set correctly ──────
update public.event_templates
  set requires_host_family = true
  where name = 'Prayer Meeting';

-- ── 4. Add Special Prayer Meeting template ────────────────────────────────
insert into public.event_templates
  (name, name_ml, group_type_hint, default_time, default_venue,
   default_visibility, default_reminder_minutes, recurrence_suggestion,
   requires_host_family, sort_order, is_provisional)
values
  ('Special Prayer', 'പ്രത്യേക പ്രാർഥനായോഗം', 'prayer', '18:00', null,
   'members', 1440, null,
   false, 3, true)
on conflict do nothing;

-- Shift sort_order of Choir Practice and below to make room
update public.event_templates
  set sort_order = sort_order + 1
  where sort_order >= 3 and name <> 'Special Prayer';
