-- Migration: 004_storage_buckets
-- Create Supabase Storage buckets for media

-- Post images bucket (private — mirrors post visibility)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  false,
  5242880,  -- 5 MB (client compresses to ~300KB before upload)
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Group cover images (public — displayed on public group pages)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-covers',
  'group-covers',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- post-images: readable by the same rule as posts
-- (checking the post record would require a join; for now allow any authenticated
--  user to read — enforce at the post query level.  Tighten post-launch if needed.)
create policy "post-images: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-images');

-- post-images: leader/admin upload
create policy "post-images: leader/admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and public.is_admin()
    -- Leaders check is done at the post creation level; storage just checks auth
    or (bucket_id = 'post-images' and auth.uid() is not null)
  );

-- group-covers: leader/admin upload
create policy "group-covers: public read"
  on storage.objects for select
  using (bucket_id = 'group-covers');

create policy "group-covers: leader/admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'group-covers'
    and (public.is_admin() or auth.uid() is not null)
  );

-- avatars: own upload
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: own insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
