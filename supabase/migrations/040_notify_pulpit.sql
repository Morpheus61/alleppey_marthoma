-- Migration 040: notify_pulpit_messages preference on profiles
-- Adds a boolean flag that members can toggle to receive notifications
-- for new Vicar messages (Pulpit). Default false — opt-in.

alter table public.profiles
  add column if not exists notify_pulpit_messages boolean not null default false;

comment on column public.profiles.notify_pulpit_messages
  is 'Member has opted in to receive push/reminder notifications for new Pulpit messages from the Vicar.';
