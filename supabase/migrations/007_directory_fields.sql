-- Migration 007: Expand profiles for full Church Directory
-- Adds: date_of_birth, address, phone_landline, whatsapp_number,
--        is_mobile_whatsapp, email, family_members (JSONB)

alter table public.profiles
  add column if not exists date_of_birth      date,
  add column if not exists address            text,
  add column if not exists phone_landline     text,
  add column if not exists whatsapp_number    text,
  add column if not exists is_mobile_whatsapp boolean not null default true,
  add column if not exists email              text,
  add column if not exists family_members     jsonb   not null default '[]'::jsonb;

-- Index for email look-ups
create index if not exists idx_profiles_email on public.profiles(email) where email is not null;
