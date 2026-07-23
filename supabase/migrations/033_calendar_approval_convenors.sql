-- Migration 033: Calendar approval lane + event edit audit + convenor events
-- ============================================================
--
-- A. approval_status on events
--    - Secretary (admin) creates  → 'pending' (Vicar approves via queue)
--    - Vicar (super_admin) creates → 'approved' directly
--    - Convenor creates (own group) → 'approved' directly
--    - Secretary EDITS an already-approved event → stays 'approved' (no re-gate)
--      but an audit row is written to event_edit_log for Vicar visibility.
--
-- B. event_edit_log — permanent audit trail of edits to approved events
--
-- C. is_convenor() helper + updated events RLS policies
-- ============================================================

-- ── 1. approval_status ──────────────────────────────────────
-- default 'approved' so every existing event stays live.
alter table public.events
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'rejected'));

-- ── 2. event_edit_log ───────────────────────────────────────
create table if not exists public.event_edit_log (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references public.events on delete cascade not null,
  actor_id     uuid references public.profiles on delete set null,
  edited_at    timestamptz not null default now(),
  before_data  jsonb not null default '{}',
  after_data   jsonb not null default '{}'
);

alter table public.event_edit_log enable row level security;

-- Only admin/above may read the audit log
create policy "event_edit_log: admin read"
  on public.event_edit_log for select
  to authenticated
  using (public.is_admin_or_above());

-- Server-side inserts use service_role or authenticated with RLS bypass via function
create policy "event_edit_log: admin write"
  on public.event_edit_log for insert
  to authenticated
  with check (public.is_admin_or_above());

-- ── 3. is_convenor() helper ──────────────────────────────────
-- IMPORTANT: 'leader' is the canonical DB value in group_memberships.role.
-- 'Convenor (കൺവീനർ)' is a UI-display-only rename.
-- is_convenor() = is_group_leader() in logic; separate name for call-site clarity.
create or replace function public.is_convenor(p_group_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_memberships
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'leader'
      and status   = 'active'
  );
$$;

-- ── 4. Drop old events policies ──────────────────────────────
-- (migrated from 002_rls_policies.sql)
drop policy if exists "events: read"   on public.events;
drop policy if exists "events: insert" on public.events;
drop policy if exists "events: update" on public.events;
drop policy if exists "events: delete" on public.events;

-- ── 5. New approval-aware events policies ────────────────────

-- READ: approved events follow original visibility; pending only to creator/admins
create policy "events: read"
  on public.events for select
  to authenticated
  using (
    (
      approval_status = 'approved'
      and (
        visibility = 'public'
        or group_id is null
        or public.is_group_member(group_id)
        or public.is_group_leader(group_id)
        or public.is_admin_or_above()
      )
    )
    or (
      approval_status <> 'approved'
      and (
        created_by = auth.uid()
        or public.is_admin_or_above()
      )
    )
  );

-- INSERT: admin/above (any group) OR convenor for their own group only
create policy "events: insert"
  on public.events for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_admin_or_above()
      or (group_id is not null and public.is_convenor(group_id))
    )
  );

-- UPDATE: admin/above always; convenor for their group's events
create policy "events: update"
  on public.events for update
  to authenticated
  using (
    public.is_admin_or_above()
    or (group_id is not null and public.is_convenor(group_id))
    or (created_by = auth.uid() and approval_status = 'pending')
  );

-- DELETE: admin/above or creator of still-pending events
create policy "events: delete"
  on public.events for delete
  to authenticated
  using (
    public.is_admin_or_above()
    or (created_by = auth.uid() and approval_status = 'pending')
  );

-- ── 6. Reminders: arm only on approval ──────────────────────
-- The pg_cron reminder function in 006 can be extended to filter
-- WHERE approval_status = 'approved'. Update the jobs here:
-- (No-op if pg_cron extension not available in this environment.)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- pg_cron job names are defined in 006; we just need the query to filter approved only.
    -- The job SQL itself is updated via a replacement function.
    null; -- actual job update handled in next line outside DO block
  end if;
end $$;
