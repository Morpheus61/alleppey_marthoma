-- Migration: 001_initial_schema
-- Creates all core tables with constraints

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  full_name     text not null,
  full_name_ml  text,
  phone         text unique not null,
  house_name    text,
  avatar_url    text,
  ui_language   text not null default 'en'
                  check (ui_language in ('en','ml')),
  is_admin      boolean not null default false,
  status        text not null default 'pending'
                  check (status in ('pending','active','disabled')),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- GROUPS
-- ============================================================
create table if not exists public.groups (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  name_ml         text,
  description     text,
  description_ml  text,
  cover_image_url text,
  group_type      text not null default 'functional'
                    check (group_type in ('functional','prayer','youth')),
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- GROUP MEMBERSHIPS
-- ============================================================
create table if not exists public.group_memberships (
  group_id   uuid references public.groups on delete cascade,
  user_id    uuid references public.profiles on delete cascade,
  role       text not null default 'member'
               check (role in ('member','leader')),
  status     text not null default 'active'
               check (status in ('requested','active','removed')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups on delete cascade,
  author_id   uuid references public.profiles not null,
  title       text,
  body        text not null,
  visibility  text not null default 'members'
                check (visibility in ('members','public')),
  image_urls  text[] not null default '{}',
  is_pinned   boolean not null default false,
  is_deleted  boolean not null default false,   -- soft-delete for undo
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts on delete cascade not null,
  author_id   uuid references public.profiles not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- EVENTS
-- ============================================================
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid references public.groups on delete cascade,
  created_by        uuid references public.profiles not null,
  title             text not null,
  title_ml          text,
  description       text,
  venue             text,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  visibility        text not null default 'public'
                      check (visibility in ('members','public')),
  rrule             text,
  reminder_minutes  int default 1440,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- EVENT RSVPs
-- ============================================================
create table if not exists public.event_rsvps (
  event_id      uuid references public.events on delete cascade,
  user_id       uuid references public.profiles on delete cascade,
  response      text not null check (response in ('yes','no','maybe')),
  responded_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles on delete cascade not null,
  subscription  jsonb not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_posts_group_id     on public.posts(group_id);
create index if not exists idx_posts_author_id    on public.posts(author_id);
create index if not exists idx_posts_created_at   on public.posts(created_at desc);
create index if not exists idx_comments_post_id   on public.comments(post_id);
create index if not exists idx_events_group_id    on public.events(group_id);
create index if not exists idx_events_starts_at   on public.events(starts_at);
create index if not exists idx_memberships_user   on public.group_memberships(user_id);
create index if not exists idx_push_user_id       on public.push_subscriptions(user_id);
create index if not exists idx_profiles_phone     on public.profiles(phone);
create index if not exists idx_profiles_status    on public.profiles(status);

-- ============================================================
-- UPDATED_AT trigger for posts
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();
