-- Migration 031: Allow admins to read ALL profiles regardless of status
-- ============================================================
-- PROBLEM: The "profiles: read active" RLS policy only exposes rows where
--   status = 'active' OR id = auth.uid()
-- There is no admin SELECT exception, so pending / disabled profiles are
-- invisible to admins in the App Users page (/admin/users) and the admin
-- dashboard "Pending Approvals" section.
-- Observed: V.E. George (status = 'pending') was completely hidden from admin.
-- FIX: Add a separate SELECT policy that grants admins full read access.
-- ============================================================

create policy "profiles: admin read all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());
