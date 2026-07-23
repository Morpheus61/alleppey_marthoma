-- Migration 034: active_profiles_with_context() RPC
-- ============================================================
-- Supports person-based role eligibility (B in the spec).
-- Any claimed, active profile — regardless of whether they are
-- the household head — appears in the role-assignment picker.
-- Each row includes house name and relation-to-head so the Vicar
-- can see exactly who they are appointing.
--
-- e.g. "Sherine Motty  ·  ഷെറിൻ മോട്ടി  ·  Daughter — Puthenveedu"
-- ============================================================

create or replace function public.active_profiles_with_context()
returns table (
  id               uuid,
  full_name        text,
  full_name_ml     text,
  phone            text,
  house_name       text,
  house_name_ml    text,
  relation_to_head text,
  display_context  text   -- "Relation — HouseName" or just HouseName; null if unlinked
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    coalesce(p.display_name, p.full_name)::text                      as full_name,
    p.full_name_ml::text,
    p.phone::text,
    fu.house_name::text,
    fu.house_name_ml::text,
    fm.relation_to_head::text,
    case
      when fm.relation_to_head is not null and fu.house_name is not null
        then initcap(fm.relation_to_head) || ' — ' || fu.house_name
      when fu.house_name is not null
        then fu.house_name
      else null
    end::text                                                         as display_context
  from public.profiles p
  left join public.family_members fm on fm.id = p.family_member_id
  left join public.family_units   fu on fu.id = fm.family_id
  where p.status = 'active'
  order by coalesce(p.display_name, p.full_name)
$$;

grant execute on function public.active_profiles_with_context() to authenticated;

-- ── Also: admin can appoint group leaders (convenors) directly ────────────
-- The original 002 "memberships: self request" only allows self-insert as member.
-- Add a policy allowing admin/above to insert any membership row.
-- Existing DB check constraint (001) already restricts role to ('member','leader').
drop policy if exists "memberships: admin insert convenor" on public.group_memberships;
drop policy if exists "memberships: admin insert"          on public.group_memberships;

create policy "memberships: admin insert"
  on public.group_memberships for insert
  to authenticated
  with check (
    -- Admin can insert memberships for any user (e.g. assignConvenor with role='leader')
    public.is_admin_or_above()
    -- Regular users can only self-request as member
    or (
      user_id = auth.uid()
      and status = 'requested'
      and role   = 'member'
      and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
    )
  );

-- Restore correct UPDATE policy (002's was based on legacy is_admin();
-- use is_admin_or_above() for proper parish_roles support).
-- 'convenor' is NOT a valid role value (DB constraint = ('member','leader')).
drop policy if exists "memberships: leader/admin update" on public.group_memberships;

create policy "memberships: leader/admin update"
  on public.group_memberships for update
  to authenticated
  using (public.is_group_leader(group_id) or public.is_admin_or_above())
  with check (
    (role in ('member', 'leader') and public.is_admin_or_above())
    or (role = 'member' and public.is_group_leader(group_id))
  );
