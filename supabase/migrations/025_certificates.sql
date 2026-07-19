-- Migration 025: Certificate Generator module
-- ============================================================

-- 1a. Add certificate-related columns to profiles (safe — IF NOT EXISTS)
alter table public.profiles
  add column if not exists baptism_date         date,
  add column if not exists baptism_register_no  text,
  add column if not exists confirmation_date    date,
  add column if not exists confirmation_register_no text,
  add column if not exists family_register_no   text,
  add column if not exists father_name          text,
  add column if not exists mother_name          text,
  add column if not exists godfather            text,
  add column if not exists godmother            text,
  add column if not exists ward                 text;

-- 1b. Certificate requests table
create table if not exists public.certificate_requests (
  id                     uuid primary key default gen_random_uuid(),
  cert_type              text not null check (cert_type in
                           ('baptism','communion','confirmation','matrimony','membership','transfer')),
  cert_no                text unique,
  member_id              uuid references public.profiles(id) on delete restrict,
  extras                 jsonb not null default '{}',
  status                 text not null default 'pending'
                           check (status in ('pending','approved','rejected')),
  created_by             uuid references public.profiles(id),
  created_at             timestamptz default now(),
  reviewed_by            uuid references public.profiles(id),
  reviewed_at            timestamptz,
  rejection_reason       text,
  secretary_signature_url  text,
  vicar_signature_url      text,
  secretary_signature_type text check (secretary_signature_type in ('drawn','uploaded')),
  vicar_signature_type     text check (vicar_signature_type in ('drawn','uploaded'))
);

alter table public.certificate_requests enable row level security;

-- Any authenticated user may submit a request
create policy "cert: anyone can insert"
  on public.certificate_requests for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Anyone can read (secretary sees their own; admin sees all via the select)
create policy "cert: authenticated can view"
  on public.certificate_requests for select
  to authenticated using (true);

-- Only admins may update (approve / reject)
create policy "cert: admin can update"
  on public.certificate_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- 1c. Storage RLS for signatures bucket (create bucket manually in Dashboard)
-- Run these after creating the 'signatures' bucket in Storage:

create policy "sig: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'signatures');

create policy "sig: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'signatures');
