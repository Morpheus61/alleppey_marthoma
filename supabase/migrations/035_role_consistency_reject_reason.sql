-- Migration 035: rejection_reason on events
-- ============================================================
-- When the Vicar rejects a pending event, the optional explanation
-- is stored here so the Secretary can see it in their calendar view.
--
-- Note: the role-value consistency fix (leader vs convenor) was
-- applied directly in 033 and 034 before they were pushed.
-- This migration only adds the new rejection_reason column.
-- ============================================================

alter table public.events
  add column if not exists rejection_reason text;

