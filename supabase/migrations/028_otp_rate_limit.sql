-- Migration 028: OTP send-rate log
-- Throttle: 3 requests per phone per 10 minutes, 100 requests globally per hour.
-- Used by /api/otp/override to protect Twilio balance.
-- This table is server-side only; no RLS needed (written via service role).

create table if not exists public.otp_send_log (
  id       bigserial primary key,
  phone    text        not null,
  sent_at  timestamptz not null default now()
);

-- Index for per-phone window queries
create index if not exists idx_otp_send_log_phone_time
  on public.otp_send_log (phone, sent_at desc);

-- Index for global window queries
create index if not exists idx_otp_send_log_time
  on public.otp_send_log (sent_at desc);

-- Auto-prune rows older than 2 hours (keep table tiny)
-- Run nightly via pg_cron if available; otherwise rows are just ignored.
-- The WHERE clause in queries means stale rows cost nothing.
