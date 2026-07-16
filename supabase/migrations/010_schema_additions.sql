-- Migration 010: Schema additions
-- 1. push_subscriptions unique constraint (prevents double-notifications on re-subscribe)
-- 2. events soft-delete columns (consistent with posts table)

-- ── push_subscriptions: unique endpoint per user ─────────────────────────
alter table public.push_subscriptions
  add column if not exists endpoint text
    generated always as (subscription->>'endpoint') stored;

create unique index if not exists uq_push_user_endpoint
  on public.push_subscriptions (user_id, endpoint);

-- ── events: soft-delete support ──────────────────────────────────────────
alter table public.events
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- Index for efficient non-deleted event queries
create index if not exists idx_events_not_deleted
  on public.events (starts_at)
  where not is_deleted;
