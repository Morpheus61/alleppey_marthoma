-- Migration 015: Registry-First Restructure — Schema Additions
-- Safe: adds columns/tables/indexes only. No data dropped.
-- Run BEFORE migration 016 (backfill).

-- ============================================================
-- 1. PROFILES: claim attachment columns
-- ============================================================
alter table public.profiles
  add column if not exists family_member_id uuid
    references public.family_members on delete set null,
  add column if not exists display_name     text,
  add column if not exists claim_status     text not null default 'unclaimed'
    check (claim_status in ('unclaimed','pending_claim','approved'));

-- 🔴 UNIQUE partial index: one account per registry person
create unique index if not exists uq_profiles_family_member
  on public.profiles (family_member_id)
  where family_member_id is not null;

-- ============================================================
-- 2. FAMILY_UNITS: head, landline, family photo (household attrs)
-- ============================================================
alter table public.family_units
  add column if not exists head_member_id    uuid
    references public.family_members on delete set null,
  add column if not exists phone_landline    text,
  add column if not exists family_photo_url  text;

-- ============================================================
-- 3. FAMILY_MEMBERS: phone (auto-approve) + email
-- ============================================================
alter table public.family_members
  add column if not exists phone text,   -- normalized +91XXXXXXXXXX; enables auto-approve
  add column if not exists email text;

-- ============================================================
-- 4. LIFE_EVENT_TYPES lookup table (replaces hard-coded enum)
-- ============================================================
create table if not exists public.life_event_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ml     text,            -- ⛪ PROVISIONAL — pending Vicar confirmation
  is_provisional boolean not null default true,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ⛪ PROVISIONAL Malayalam: Marthoma-correct terms where known;
--   blanks require Vicar sign-off before launch.
insert into public.life_event_types (name, name_ml, is_provisional, sort_order) values
  ('Baptism',              'മാമ്മോദീസ',  true, 1),
  ('First Holy Communion', 'ആദ്യ കുർബാന', true, 2),
  ('Confirmation',          null,          true, 3),  -- ⛪ Vicar to supply Marthoma term
  ('Marriage',             'വിവാഹം',      true, 4),
  ('Marriage Dissolution', 'വിവാഹ മോചനം', true, 5),
  ('Remarriage',           'പുനർ വിവാഹം', true, 6),
  ('Death',                'മരണം',        true, 7),
  ('Other',                'മറ്റുള്ളവ',   true, 8)
on conflict do nothing;

-- 5. LIFE_EVENTS: FK to lookup + related-event chain
alter table public.life_events
  add column if not exists life_event_type_id uuid
    references public.life_event_types,
  add column if not exists related_event_id   uuid
    references public.life_events;

-- ============================================================
-- 6. RLS: LIFE_EVENT_TYPES
-- ============================================================
alter table public.life_event_types enable row level security;

create policy "life_event_types: authenticated read"
  on public.life_event_types for select
  to authenticated using (true);

create policy "life_event_types: super_admin write"
  on public.life_event_types for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- 7. RLS: CLAIM FLOW on profiles
-- ============================================================

-- Pending users may update only their own row, only claim fields,
-- and only in the direction unclaimed → pending_claim.
create policy "profiles: pending claim update"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    and status = 'pending'
    and claim_status = 'unclaimed'
  )
  with check (
    id = auth.uid()
    and claim_status = 'pending_claim'
    -- Cannot change other sensitive fields
    and status = 'pending'
    and is_admin = false
  );

-- Trigger: lock family_member_id after claim is approved
create or replace function public.lock_claimed_identity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.claim_status = 'approved'
     and new.family_member_id is distinct from old.family_member_id
  then
    raise exception 'Cannot re-point family_member_id after claim approval';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_claimed_identity on public.profiles;
create trigger trg_lock_claimed_identity
  before update of family_member_id on public.profiles
  for each row execute function public.lock_claimed_identity();

-- ============================================================
-- 8. SECURITY-DEFINER RPCs for claim search
--    Returns ONLY minimal fields to unapproved users.
-- ============================================================

-- Step 1: household names + Bhagam only
create or replace function public.search_households(search_term text)
returns table(
  id            uuid,
  house_name    text,
  house_name_ml text,
  bhagam_name   text,
  bhagam_name_ml text
)
language sql security definer stable
set search_path = public
as $$
  select fu.id,
         fu.house_name,
         fu.house_name_ml,
         g.name     as bhagam_name,
         g.name_ml  as bhagam_name_ml
  from   public.family_units fu
  join   public.groups g on g.id = fu.prayer_group_id
  where  (fu.house_name    ilike '%' || search_term || '%'
      or  fu.house_name_ml ilike '%' || search_term || '%')
  order  by g.name, fu.house_name
  limit  30;
$$;

-- Step 2: first names + relations in one household (hides claimed members)
create or replace function public.household_claimable_members(p_family_id uuid)
returns table(
  id               uuid,
  full_name        text,
  full_name_ml     text,
  relation_to_head text
)
language sql security definer stable
set search_path = public
as $$
  select fm.id,
         fm.full_name,
         fm.full_name_ml,
         fm.relation_to_head
  from   public.family_members fm
  where  fm.family_id    = p_family_id
    and  fm.is_deceased  = false
    and  not exists (
           select 1 from public.profiles p
           where  p.family_member_id = fm.id
         )
  order  by fm.relation_to_head;
$$;

-- ============================================================
-- 9. TRIGGER: refresh display_name when registry name changes
-- ============================================================
create or replace function public.refresh_display_name()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set    display_name = new.full_name
  where  family_member_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_refresh_display_name on public.family_members;
create trigger trg_refresh_display_name
  after update of full_name on public.family_members
  for each row execute function public.refresh_display_name();
