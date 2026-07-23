-- Migration 039: Link Certificate Requests to the Parish Registry
-- ============================================================
-- Problem: certificate_requests.member_id → profiles, so only people
-- with an active app account appear in the "Select Member" search.
-- Most registry members have no account yet, so the dropdown is empty.
--
-- Fix:
--   1. Add family_register_no to family_units (household-level attribute).
--   2. Add family_member_id to certificate_requests (FK → family_members).
--   3. Backfill family_member_id for existing certificates.
--   4. RPC search_registry_for_certs  — full-text search across
--      family_members + family_units + life_events, returns flat rows.
--   5. RPC get_registry_member_for_cert — single member lookup by
--      family_member_id; used by the approval and detail pages.
-- ============================================================


-- ── 1. family_register_no on family_units ────────────────────────────────
alter table public.family_units
  add column if not exists family_register_no text;

comment on column public.family_units.family_register_no is
  'Parish family register number assigned at registration. Source of truth at household level.';


-- ── 2. family_member_id on certificate_requests ──────────────────────────
alter table public.certificate_requests
  add column if not exists family_member_id uuid
    references public.family_members(id) on delete restrict;

comment on column public.certificate_requests.family_member_id is
  'Registry person (family_members.id) for whom the certificate is issued. '
  'Supersedes the legacy member_id (profiles.id) link.';


-- ── 3. Backfill: existing certs where profile is linked to a registry member
update public.certificate_requests cr
set family_member_id = fm.id
from public.family_members fm
where fm.profile_id = cr.member_id
  and cr.family_member_id is null;


-- ── 4. RPC: search_registry_for_certs ────────────────────────────────────
-- Called from the "Select Member" search box on the certificate form.
-- Searches by member name (English or Malayalam) OR family/house name.
-- Returns a flat row per matching living family member.
create or replace function public.search_registry_for_certs(p_query text)
returns table (
  id                       uuid,     -- family_members.id — use as family_member_id
  family_id                uuid,
  full_name                text,
  full_name_ml             text,
  date_of_birth            date,
  relation_to_head         text,
  phone                    text,
  house_name               text,
  house_name_ml            text,
  address                  text,
  family_register_no       text,
  ward                     text,     -- prayer group / Bhagam name
  profile_id               uuid,     -- linked app account, if any
  baptism_date             date,
  baptism_register_no      text,
  confirmation_date        date,
  confirmation_register_no text,
  father_name              text,     -- head of same family_unit (heuristic)
  mother_name              text,     -- spouse of head (heuristic)
  godfather                text,     -- always null — entered via extras
  godmother                text      -- always null — entered via extras
)
language sql
security definer
set search_path = public
as $$
  select
    fm.id,
    fu.id                                               as family_id,
    fm.full_name,
    fm.full_name_ml,
    fm.date_of_birth,
    fm.relation_to_head,
    fm.phone,
    fu.house_name,
    fu.house_name_ml,
    fu.address,
    fu.family_register_no,
    g.name                                              as ward,
    fm.profile_id,
    -- Latest non-superseded baptism event
    ( select le.event_date
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'baptism'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    )                                                   as baptism_date,
    ( select le.register_number
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'baptism'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    )                                                   as baptism_register_no,
    -- Latest non-superseded confirmation event
    ( select le.event_date
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'confirmation'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    )                                                   as confirmation_date,
    ( select le.register_number
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'confirmation'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    )                                                   as confirmation_register_no,
    -- Father = head of the household (heuristic for children's certificates)
    ( select fm2.full_name
      from   family_members fm2
      where  fm2.family_id        = fu.id
        and  lower(fm2.relation_to_head) = 'head'
        and  not fm2.is_deceased
      limit  1
    )                                                   as father_name,
    -- Mother = spouse of head
    ( select fm2.full_name
      from   family_members fm2
      where  fm2.family_id        = fu.id
        and  lower(fm2.relation_to_head) = 'spouse'
        and  not fm2.is_deceased
      limit  1
    )                                                   as mother_name,
    null::text                                          as godfather,
    null::text                                          as godmother
  from  public.family_members fm
  join  public.family_units   fu on fu.id = fm.family_id
  left  join public.groups    g  on g.id  = fu.prayer_group_id
  where not fm.is_deceased
    and (
          fm.full_name      ilike '%' || p_query || '%'
      or  fm.full_name_ml   ilike '%' || p_query || '%'
      or  fu.house_name     ilike '%' || p_query || '%'
      or  fu.house_name_ml  ilike '%' || p_query || '%'
    )
  order  by fu.house_name, fm.full_name
  limit  25;
$$;

grant execute on function public.search_registry_for_certs(text) to authenticated;


-- ── 5. RPC: get_registry_member_for_cert ─────────────────────────────────
-- Single-member lookup by family_member_id.
-- Used by the approval queue and certificate detail page to rebuild the
-- MemberRecord when rendering / downloading the PDF.
create or replace function public.get_registry_member_for_cert(p_id uuid)
returns table (
  id                       uuid,
  family_id                uuid,
  full_name                text,
  full_name_ml             text,
  date_of_birth            date,
  relation_to_head         text,
  phone                    text,
  house_name               text,
  house_name_ml            text,
  address                  text,
  family_register_no       text,
  ward                     text,
  profile_id               uuid,
  baptism_date             date,
  baptism_register_no      text,
  confirmation_date        date,
  confirmation_register_no text,
  father_name              text,
  mother_name              text,
  godfather                text,
  godmother                text
)
language sql
security definer
set search_path = public
as $$
  select
    fm.id,
    fu.id                                               as family_id,
    fm.full_name,
    fm.full_name_ml,
    fm.date_of_birth,
    fm.relation_to_head,
    fm.phone,
    fu.house_name,
    fu.house_name_ml,
    fu.address,
    fu.family_register_no,
    g.name                                              as ward,
    fm.profile_id,
    ( select le.event_date
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'baptism'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    ),
    ( select le.register_number
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'baptism'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    ),
    ( select le.event_date
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'confirmation'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    ),
    ( select le.register_number
      from   life_events le
      where  le.family_member_id = fm.id
        and  le.event_type        = 'confirmation'
        and  le.superseded_by     is null
      order  by le.event_date
      limit  1
    ),
    ( select fm2.full_name
      from   family_members fm2
      where  fm2.family_id        = fu.id
        and  lower(fm2.relation_to_head) = 'head'
        and  not fm2.is_deceased
      limit  1
    ),
    ( select fm2.full_name
      from   family_members fm2
      where  fm2.family_id        = fu.id
        and  lower(fm2.relation_to_head) = 'spouse'
        and  not fm2.is_deceased
      limit  1
    ),
    null::text,
    null::text
  from  public.family_members fm
  join  public.family_units   fu on fu.id = fm.family_id
  left  join public.groups    g  on g.id  = fu.prayer_group_id
  where fm.id = p_id;
$$;

grant execute on function public.get_registry_member_for_cert(uuid) to authenticated;
