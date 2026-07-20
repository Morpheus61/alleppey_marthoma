-- Migration 027: The Pulpit — Vicar's Message Feature
-- Run in Supabase SQL Editor after migration 026.

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.pulpit_messages (
  id                 uuid primary key default gen_random_uuid(),
  title              text,
  body               text not null,
  body_ml            text,
  scripture_ref      text,
  scripture_text     text,
  scripture_text_ml  text,
  is_published       boolean not null default true,
  is_pinned          boolean not null default false,
  author_id          uuid references public.profiles(id),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists idx_pulpit_messages_published
  on public.pulpit_messages (created_at desc)
  where is_published = true;

create table if not exists public.pulpit_amens (
  message_id  uuid references public.pulpit_messages(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (message_id, user_id)
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.pulpit_messages enable row level security;
alter table public.pulpit_amens     enable row level security;

-- All authenticated members can read published messages
-- Section G1: flip to anon + authenticated so shared links open for anyone
create policy "pulpit_messages: public read published"
  on public.pulpit_messages for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

-- Vicar / admin can insert, update, delete
create policy "pulpit_messages: admin manage"
  on public.pulpit_messages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members can amen (insert own row)
create policy "pulpit_amens: members insert"
  on public.pulpit_amens for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Members can remove own amen
create policy "pulpit_amens: members delete own"
  on public.pulpit_amens for delete
  to authenticated
  using (auth.uid() = user_id);

-- Section G1: amen counts also public so the count renders for guests
create policy "pulpit_amens: public read"
  on public.pulpit_amens for select
  to anon, authenticated
  using (true);

-- ============================================================
-- SINGLE-PIN TRIGGER
-- When a message is pinned, unpin all others automatically.
-- ============================================================

create or replace function public.unpin_other_pulpit_messages()
returns trigger language plpgsql as $$
begin
  if new.is_pinned = true then
    update public.pulpit_messages
    set is_pinned = false
    where id != new.id
      and is_pinned = true;
  end if;
  return new;
end;
$$;

create trigger enforce_single_pulpit_pin
  before insert or update on public.pulpit_messages
  for each row execute function public.unpin_other_pulpit_messages();
