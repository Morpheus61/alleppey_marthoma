-- Migration: 003_auth_trigger (updated for registry-first claim flow)
-- Creates a minimal profile on signup. Identity comes from the claim flow,
-- not from OTP metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := new.phone;

  -- If this phone already exists as a profile (legacy pre-migration case), link it
  if exists (
    select 1 from public.profiles where phone = v_phone and id is null
  ) then
    update public.profiles
    set    id           = new.id,
           claim_status = 'approved',
           status       = 'active'
    where  phone = v_phone and id is null;
  else
    -- Fresh signup: minimal profile — name comes from registry claim
    insert into public.profiles (id, phone, status, claim_status)
    values (
      new.id,
      v_phone,
      'pending',
      'unclaimed'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Drop and recreate to handle re-runs cleanly
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
