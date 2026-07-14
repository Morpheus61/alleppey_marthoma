-- Migration: 003_auth_trigger
-- Auto-create profiles row on new Supabase auth signup

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  -- Extract phone from auth.users metadata
  v_phone := new.phone;

  -- Check if a pre-registered profile exists (bulk import case)
  -- Pre-registered profiles have status='pending' and no id yet
  -- We match on phone (normalised to +91XXXXXXXXXX)
  if exists (
    select 1 from public.profiles
    where phone = v_phone and id is null
  ) then
    -- Update the pre-registered row to link to the new auth user
    update public.profiles
    set id = new.id, status = 'active'  -- pre-approved on first login
    where phone = v_phone and id is null;
  else
    -- Fresh signup → insert pending profile
    insert into public.profiles (id, full_name, phone, status)
    values (
      new.id,
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        'New Member'
      ),
      v_phone,
      'pending'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- Drop and recreate to handle re-runs cleanly
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
