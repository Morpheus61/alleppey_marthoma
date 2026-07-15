-- Migration 009: Profile & Family Photos
-- Adds family_photo_url to profiles
-- Adds admin override for avatars storage bucket

alter table public.profiles
  add column if not exists family_photo_url text;

-- Allow admins to upload to any path in the avatars bucket
-- (e.g. to upload a photo on behalf of a member)
create policy "avatars: admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_admin()
  );

-- Allow users to update (replace) their own avatar files
create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow admins to update any avatar
create policy "avatars: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_admin()
  );
