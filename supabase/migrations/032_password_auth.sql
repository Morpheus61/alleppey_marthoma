-- Migration 032: Password-based login support
-- ============================================================
-- CHANGE: SMS OTP is now used ONLY for first-time registration
--         and password reset. Subsequent logins use phone+password.
--
-- Adds:
--   profiles.has_password  (bool)  — set to true once user sets a password
--   phone_auth_mode(phone) (text)  — public RPC used by login page to route
--                                    returning users → password step
--                                    new users      → OTP step
-- ============================================================

alter table public.profiles
  add column if not exists has_password boolean not null default false;

-- Match phone numbers in any format:
--   '6282427364'      (10-digit national, stored by addMember)
--   '+916282427364'   (E.164, stored by auth trigger)
--   '971526112345'    (international with country code)
-- Strategy: compare the last N digits of both numbers, where N = length of
-- the input national number. This is safe for 300-row parish tables.
create or replace function public.phone_auth_mode(p_phone text)
  returns text
  language sql
  security definer
  set search_path = public
as $$
  select case
    when exists (
      select 1
      from   public.profiles
      where  right(
               regexp_replace(phone,   '[^0-9]', '', 'g'),
               char_length(regexp_replace(p_phone, '[^0-9]', '', 'g'))
             ) = regexp_replace(p_phone, '[^0-9]', '', 'g')
        and  has_password = true
    ) then 'password'::text
    else       'otp'::text
  end
$$;

grant execute on function public.phone_auth_mode(text) to anon, authenticated;
