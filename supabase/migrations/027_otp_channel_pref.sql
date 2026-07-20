-- Migration 027: OTP channel preference
-- Written by the /api/otp-channel route before signInWithOtp is called.
-- Read and deleted by the send-otp Edge Function Auth Hook.

create table if not exists public.otp_channel_pref (
  phone_e164  text primary key,
  channel     text not null default 'whatsapp'
                check (channel in ('sms', 'whatsapp')),
  set_at      timestamptz not null default now()
);

-- No RLS — accessed only via service_role key from server routes.
