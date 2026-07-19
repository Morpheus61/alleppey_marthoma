-- Migration 024: Family directory RPC + complete_claim v3 (copy all registry fields)
-- ============================================================
-- PART A: Fix complete_claim to copy DOB, gender, email from family_members
--         so the profile is "complete" immediately after first login/claim.
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
  v_dob          date;
  v_gender       text;
  v_email        text;
begin
  -- Re-verify the member is still unclaimed (race-condition guard)
  select full_name, full_name_ml, date_of_birth, gender, email
    into v_full_name, v_full_name_ml, v_dob, v_gender, v_email
  from   public.family_members
  where  id = p_family_member_id
    and  not exists (
           select 1 from public.profiles
           where  family_member_id = p_family_member_id
         );

  if not found then
    raise exception 'Registry person not found or already claimed';
  end if;

  -- Update the profile — bypasses the status-lock RLS WITH CHECK.
  -- Copies all available registry fields so the profile is immediately complete.
  update public.profiles
  set
    family_member_id = p_family_member_id,
    display_name     = v_full_name,
    full_name        = v_full_name,
    full_name_ml     = v_full_name_ml,
    date_of_birth    = coalesce(v_dob,    date_of_birth),
    email            = coalesce(v_email,  email),
    claim_status     = case when p_auto_approve then 'approved'      else 'pending_claim' end,
    status           = case when p_auto_approve then 'active'        else 'pending'       end
  where  id           = auth.uid()
    and  claim_status = 'unclaimed';

  if not found then
    raise exception 'Claim could not be applied — profile already processed';
  end if;

  -- Keep family_members.profile_id in sync
  update public.family_members
  set    profile_id = auth.uid()
  where  id = p_family_member_id;
end;
$$;

-- Backfill DOB and email for profiles that were claimed before this migration
update public.profiles p
set
  date_of_birth = coalesce(p.date_of_birth, fm.date_of_birth),
  email         = coalesce(p.email,         fm.email)
from public.family_members fm
where p.family_member_id = fm.id
  and (p.date_of_birth is null or p.email is null);

-- ============================================================
-- PART B: Security-definer RPC for the family-based directory.
--         Returns all households with their members and wedding date.
--         Any authenticated member may call this; it bypasses the
--         family_members RLS (which otherwise only allows reading
--         your own household).
-- ============================================================

create or replace function public.get_family_directory()
returns table(
  family_id      uuid,
  house_name     text,
  house_name_ml  text,
  address        text,
  bhagam_name    text,
  bhagam_name_ml text,
  members        jsonb,
  wedding_date   text   -- 'YYYY-MM-DD' string (nullable)
)
language sql security definer stable
set search_path = public
as $$
  select
    fu.id                          as family_id,
    fu.house_name,
    fu.house_name_ml,
    fu.address,
    g.name                         as bhagam_name,
    g.name_ml                      as bhagam_name_ml,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',            fm.id,
          'full_name',     fm.full_name,
          'full_name_ml',  fm.full_name_ml,
          'relation',      fm.relation_to_head,
          'date_of_birth', to_char(fm.date_of_birth, 'YYYY-MM-DD'),
          'gender',        fm.gender,
          'phone',         fm.phone,
          'email',         fm.email
        ) order by
          case fm.relation_to_head
            when 'head'       then 1
            when 'spouse'     then 2
            when 'son'        then 3
            when 'daughter'   then 4
            when 'father'     then 5
            when 'mother'     then 6
            when 'brother'    then 7
            when 'sister'     then 8
            when 'grandchild' then 9
            else 10
          end,
          fm.full_name
      ) filter (where not fm.is_deceased),
      '[]'::jsonb
    )                              as members,
    -- Most recent marriage life-event for this household
    (
      select to_char(le.event_date, 'YYYY-MM-DD')
      from   public.life_events le
      join   public.family_members fm2 on fm2.id = le.family_member_id
      where  fm2.family_id = fu.id
        and  le.event_type  = 'marriage'
        and  le.superseded_by is null
      order  by le.event_date desc
      limit  1
    )                              as wedding_date
  from   public.family_units fu
  join   public.groups g     on g.id  = fu.prayer_group_id
  left join public.family_members fm on fm.family_id = fu.id
  group  by fu.id, fu.house_name, fu.house_name_ml, fu.address, g.name, g.name_ml
  order  by fu.house_name;
$$;
