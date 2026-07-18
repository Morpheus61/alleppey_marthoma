-- Migration 019: Backfill profiles.family_member_id for accounts linked via registry
-- ============================================================
-- When the admin used "Link account" in the registry (linkProfileToMember),
-- it set family_members.profile_id but NOT profiles.family_member_id.
-- This broke the Finance page which relies on profiles.family_member_id
-- as its primary lookup (fallback via family_members.profile_id also exists
-- but RLS on family_members requires the link to be set first).
--
-- This migration syncs both directions for any existing mismatches.
-- ============================================================

update public.profiles p
set
  family_member_id = fm.id,
  claim_status     = 'approved'
from public.family_members fm
where fm.profile_id = p.id
  and p.family_member_id is null   -- only fix rows not already set
  and p.status = 'active';
