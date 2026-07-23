-- Migration 036: Fix profiles admin-update policy to use is_admin_or_above()
-- ============================================================
-- ROOT CAUSE: "profiles: admin update any" used is_admin() which checks
-- profiles.is_admin = true.  Admins/Vicars assigned via parish_roles (the
-- correct post-Wave-2 path) have is_admin = false, so every server-action
-- attempt to update another user's profile was silently blocked by RLS.
-- Effect: linkProfileToMember could set family_members.profile_id correctly
-- (that table uses is_admin_or_above()) but could NEVER update
-- profiles.family_member_id or profiles.display_name.
--
-- FIX: Replace is_admin() with is_admin_or_above() on all three profile
-- policies that gate on admin identity.
-- ============================================================

-- ── Profiles: update ─────────────────────────────────────────
drop policy if exists "profiles: admin update any" on public.profiles;

create policy "profiles: admin update any"
  on public.profiles for update
  to authenticated
  using  (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ── Profiles: read ───────────────────────────────────────────
-- 031 added "profiles: admin read all" using is_admin() — same gap.
drop policy if exists "profiles: admin read all" on public.profiles;

create policy "profiles: admin read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin_or_above());

-- ── Profiles: insert via trigger ─────────────────────────────
-- Already service_role — no change needed.

-- ── Backfill: sync any profiles whose display_name or family_member_id
--    were not updated due to the RLS gap (idempotent) ─────────
update public.profiles p
set
  display_name     = fm.full_name,
  family_member_id = fm.id
from public.family_members fm
where fm.profile_id = p.id
  and (
    p.family_member_id is distinct from fm.id
    or p.display_name   is distinct from fm.full_name
  );
