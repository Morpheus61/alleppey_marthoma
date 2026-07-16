-- Migration 012: Parish Registry
-- Replaces profiles.family_members JSONB with proper relational tables.
-- family_units → family_members → life_events

-- ============================================================
-- FAMILY UNITS (households)
-- ============================================================
create table if not exists public.family_units (
  id               uuid primary key default gen_random_uuid(),
  house_name       text not null,
  house_name_ml    text,
  address          text,
  prayer_group_id  uuid references public.groups on delete restrict not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_family_units_prayer_group
  on public.family_units (prayer_group_id);

-- ============================================================
-- FAMILY MEMBERS (individuals within a household)
-- ============================================================
create table if not exists public.family_members (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid references public.family_units on delete cascade not null,
  profile_id       uuid references public.profiles on delete set null,
  full_name        text not null,
  full_name_ml     text,
  relation_to_head text,   -- 'head','spouse','son','daughter','father','mother','other'
  date_of_birth    date,
  gender           text check (gender in ('male','female','other')),
  is_deceased      boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_family_members_family
  on public.family_members (family_id);
create index if not exists idx_family_members_profile
  on public.family_members (profile_id)
  where profile_id is not null;

-- ============================================================
-- LIFE EVENTS (baptism, confirmation, marriage, death, other)
-- ============================================================
create table if not exists public.life_events (
  id                 uuid primary key default gen_random_uuid(),
  family_member_id   uuid references public.family_members on delete cascade not null,
  event_type         text not null
                       check (event_type in ('baptism','confirmation','marriage','death','other')),
  event_date         date not null,
  place              text,
  officiant          text,
  register_number    text,
  certificate_number text,
  remarks            text,
  recorded_by        uuid references public.profiles not null,
  superseded_by      uuid references public.life_events,  -- corrections chain; never edit in place
  created_at         timestamptz not null default now()
);

create index if not exists idx_life_events_member
  on public.life_events (family_member_id, event_date desc);
create index if not exists idx_life_events_type_date
  on public.life_events (event_type, event_date desc);

-- ============================================================
-- RECEIPT SEQUENCE (used later in finance migration)
-- ============================================================
create sequence if not exists public.receipt_seq start 1;

-- ============================================================
-- APP SETTINGS (key-value store for runtime config)
-- ============================================================
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_by  uuid references public.profiles,
  updated_at  timestamptz not null default now()
);

-- Default receipt settings (⛪CONFIG-3: Vicar to confirm/override post-launch)
insert into public.app_settings (key, value, description) values
  ('receipt_prefix',       'SGM-D-',     'Prefix for digital receipts'),
  ('receipt_start_number', '1',          'Starting number for digital receipt sequence'),
  ('show_arrears_to_family','false',     '⛪CONFIG-4: Show arrears balance to member families'),
  ('cash_grace_days',      '7',          'Grace days past collection window for cash entry'),
  ('church_bank_name',     '',           'Bank name for member payment instructions'),
  ('church_bank_account',  '',           'Account number for member payment instructions'),
  ('church_bank_ifsc',     '',           'IFSC code'),
  ('church_upi_id',        '',           'UPI ID for QR/deep-link')
on conflict (key) do nothing;

-- ============================================================
-- DIRECTORY VIEW (privacy projection — replaces direct profile queries in directory)
-- ============================================================
-- Exposes ONLY the fields that members are allowed to see in the directory.
-- DOB, address, email, family members, life events NEVER appear here.
create or replace view public.directory_entries as
select
  p.id              as profile_id,
  p.full_name,
  p.full_name_ml,
  p.avatar_url,
  p.phone           as whatsapp_contact,  -- shown only when is_mobile_whatsapp
  p.is_mobile_whatsapp,
  p.whatsapp_number,
  p.is_admin,       -- kept for admin badge in directory
  f.id              as family_id,
  f.house_name,
  f.house_name_ml,
  g.id              as prayer_group_id,
  g.name            as prayer_group_name,
  g.name_ml         as prayer_group_name_ml,
  p.family_photo_url,
  p.status
from public.profiles p
left join public.family_members fm on fm.profile_id = p.id and not fm.is_deceased
left join public.family_units f    on f.id = fm.family_id
left join public.groups g          on g.id = f.prayer_group_id
where p.status = 'active';

-- ============================================================
-- TRIGGER: Ward (prayer-group) membership from family assignment
-- When a family's prayer_group_id changes, update group_memberships
-- for all linked profiles automatically (no join-request needed).
-- ============================================================
create or replace function public.sync_ward_membership()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Remove old ward memberships for all profiles in this family
  if TG_OP = 'UPDATE' and old.prayer_group_id <> new.prayer_group_id then
    delete from group_memberships gm
    using family_members fm
    where fm.family_id = new.id
      and fm.profile_id is not null
      and gm.user_id = fm.profile_id
      and gm.group_id = old.prayer_group_id
      and gm.status = 'active';
  end if;

  -- Insert/restore ward membership for all linked profiles in this family
  insert into group_memberships (group_id, user_id, role, status, joined_at)
  select new.prayer_group_id, fm.profile_id, 'member', 'active', now()
  from family_members fm
  where fm.family_id = new.id
    and fm.profile_id is not null
    and not fm.is_deceased
  on conflict (group_id, user_id) do update
    set status = 'active';

  return new;
end;
$$;

drop trigger if exists trg_sync_ward_membership on public.family_units;
create trigger trg_sync_ward_membership
  after insert or update of prayer_group_id on public.family_units
  for each row execute function public.sync_ward_membership();

-- Sync when a family_member gains a profile link
create or replace function public.sync_member_ward_on_profile_link()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.profile_id is not null and not new.is_deceased then
    insert into group_memberships (group_id, user_id, role, status, joined_at)
    select fu.prayer_group_id, new.profile_id, 'member', 'active', now()
    from family_units fu
    where fu.id = new.family_id
    on conflict (group_id, user_id) do update set status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_member_ward on public.family_members;
create trigger trg_sync_member_ward
  after insert or update of profile_id, is_deceased on public.family_members
  for each row execute function public.sync_member_ward_on_profile_link();

-- ============================================================
-- RLS: FAMILY UNITS
-- ============================================================
alter table public.family_units enable row level security;

-- Super_admin: full access
create policy "family_units: super_admin all"
  on public.family_units for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- Admin+: read all
create policy "family_units: admin read"
  on public.family_units for select
  to authenticated
  using (public.is_admin_or_above());

-- Member: read their own family
create policy "family_units: member read own"
  on public.family_units for select
  to authenticated
  using (
    exists (
      select 1 from public.family_members fm
      where fm.family_id = id
        and fm.profile_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: FAMILY MEMBERS
-- ============================================================
alter table public.family_members enable row level security;

create policy "family_members: super_admin all"
  on public.family_members for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

create policy "family_members: admin read"
  on public.family_members for select
  to authenticated
  using (public.is_admin_or_above());

create policy "family_members: member read own family"
  on public.family_members for select
  to authenticated
  using (
    exists (
      select 1 from public.family_members fm2
      where fm2.family_id = family_id
        and fm2.profile_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: LIFE EVENTS
-- ============================================================
alter table public.life_events enable row level security;

create policy "life_events: super_admin all"
  on public.life_events for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

create policy "life_events: admin read"
  on public.life_events for select
  to authenticated
  using (public.is_admin_or_above());

create policy "life_events: member read own"
  on public.life_events for select
  to authenticated
  using (
    exists (
      select 1 from public.family_members fm
      join   public.family_members fm2 on fm2.family_id = fm.family_id
                                      and fm2.profile_id = auth.uid()
      where fm.id = family_member_id
    )
  );

-- Only super_admin inserts (admin/treasurer via change_requests)
create policy "life_events: super_admin insert"
  on public.life_events for insert
  to authenticated
  with check (public.is_super_admin());

-- ============================================================
-- RLS: DIRECTORY VIEW is based on underlying policies — no RLS needed on the view
-- ============================================================

-- ============================================================
-- RLS: APP SETTINGS
-- ============================================================
alter table public.app_settings enable row level security;

create policy "app_settings: authenticated read"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "app_settings: super_admin write"
  on public.app_settings for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- DATA MIGRATION: profiles.family_members JSONB → family_members rows
-- Families are placed in prayer group 'yuvajana-sakhyam' as placeholder;
-- must be re-assigned to correct Bhagam by admin post-migration.
-- ============================================================
do $$
declare
  v_placeholder_group uuid;
begin
  -- Get any prayer group to use as placeholder (admin will re-assign)
  select id into v_placeholder_group
  from public.groups
  where group_type = 'prayer' and not is_archived
  limit 1;

  if v_placeholder_group is null then
    -- Fall back to any group if no prayer groups exist
    select id into v_placeholder_group from public.groups limit 1;
  end if;

  -- For each profile that has family_members, create a family_unit and rows
  with profiles_with_family as (
    select id, full_name, house_name, address,
           family_members as fm_jsonb
    from public.profiles
    where family_members is not null
      and jsonb_array_length(family_members) > 0
      -- skip if already migrated
      and not exists (
        select 1 from public.family_members fmr
        where fmr.profile_id = profiles.id
      )
  ),
  inserted_families as (
    insert into public.family_units (house_name, address, prayer_group_id)
    select
      coalesce(house_name, full_name || ' Family'),
      address,
      v_placeholder_group
    from profiles_with_family
    returning id, house_name
  )
  -- head-of-family row
  insert into public.family_members (family_id, profile_id, full_name, full_name_ml, relation_to_head)
  select if2.id, pwf.id, pwf.full_name, null, 'head'
  from profiles_with_family pwf
  join inserted_families if2
    on if2.house_name = coalesce(pwf.house_name, pwf.full_name || ' Family');

  -- Family member rows from JSONB
  -- (simplified — dob/relation only; admin completes the rest)
  insert into public.family_members (family_id, full_name, relation_to_head, date_of_birth)
  select
    fu.id,
    fm_row->>'name',
    lower(fm_row->>'relation'),
    case when (fm_row->>'dob') <> '' then (fm_row->>'dob')::date end
  from public.profiles p
  join public.family_members head_fm on head_fm.profile_id = p.id
  join public.family_units fu         on fu.id = head_fm.family_id
  cross join jsonb_array_elements(p.family_members) as fm_row
  where p.family_members is not null
    and jsonb_array_length(p.family_members) > 0
    and (fm_row->>'name') is not null
    and (fm_row->>'name') <> '';

exception when others then
  raise notice 'family migration skipped or partial: %', sqlerrm;
end;
$$;
