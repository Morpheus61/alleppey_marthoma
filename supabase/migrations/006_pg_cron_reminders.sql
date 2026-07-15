-- =============================================================================
-- Migration 006: pg_cron reminder schedule
-- =============================================================================
-- BEFORE RUNNING: replace the two placeholders below with real values.
-- __APP_URL__    → your Vercel app URL, e.g. https://alleppeymarthoma.vercel.app
-- __CRON_SECRET__ → the value of CRON_SECRET from your .env.local / Vercel env vars
--
-- Run this migration manually in the Supabase SQL Editor.
-- DO NOT commit real values. DO NOT run via automated migration tooling.
-- After the parish custom domain is live, re-run with the new URL.
-- =============================================================================

-- Enable required extensions (idempotent)
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- Remove any existing schedule before (re)creating — idempotent
select
  case
    when exists (select 1 from cron.job where jobname = 'event-reminders')
    then cron.unschedule('event-reminders')
  end;

-- Schedule: POST to the reminder route every 15 minutes
select cron.schedule(
  'event-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := '__APP_URL__/api/cron/reminders',
    headers := '{"Authorization": "Bearer __CRON_SECRET__", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
