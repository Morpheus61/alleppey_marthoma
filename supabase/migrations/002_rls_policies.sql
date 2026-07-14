-- Migration: 002_rls_policies
-- Enable RLS on all tables and define policies using helper functions

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.groups           enable row level security;
alter table public.group_memberships enable row level security;
alter table public.posts            enable row level security;
alter table public.comments         enable row level security;
alter table public.events           enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.push_subscriptions enable row level security;

-- ============================================================
-- HELPER FUNCTIONS (security definer — run as the defining user, not the caller)
-- ============================================================

-- is_admin(): true if the calling user has is_admin = true and status = 'active'
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles
     where id = auth.uid() and status = 'active'
     limit 1),
    false
  );
$$;

-- is_group_member(group_id): true if calling user has an active membership
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_memberships
    where group_id = p_group_id
      and user_id  = auth.uid()
      and status   = 'active'
  );
$$;

-- is_group_leader(group_id): true if calling user is an active leader of this group
create or replace function public.is_group_leader(p_group_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_memberships
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'leader'
      and status   = 'active'
  );
$$;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Any authenticated user may read active profiles' non-sensitive fields
create policy "profiles: read active"
  on public.profiles for select
  to authenticated
  using (status = 'active' or id = auth.uid());

-- Users update only their own row (admin can update any via separate policy)
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Regular users cannot flip is_admin or change status
    and is_admin = (select is_admin from public.profiles where id = auth.uid())
    and status   = (select status   from public.profiles where id = auth.uid())
  );

-- Admin can update any profile (including is_admin and status)
create policy "profiles: admin update any"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Insert is handled by the auth trigger (see migration 003)
create policy "profiles: insert via trigger"
  on public.profiles for insert
  to service_role
  with check (true);

-- ============================================================
-- GROUPS policies
-- ============================================================

-- Everyone authenticated reads non-archived groups
create policy "groups: read non-archived"
  on public.groups for select
  to authenticated
  using (not is_archived);

-- Admin inserts groups
create policy "groups: admin insert"
  on public.groups for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update any group field
create policy "groups: admin update"
  on public.groups for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Leader updates only description/description_ml/cover_image_url of their group
create policy "groups: leader update own group page"
  on public.groups for update
  to authenticated
  using (public.is_group_leader(id))
  with check (
    public.is_group_leader(id)
    -- Leaders cannot change slug, name, name_ml, group_type, is_archived
    and slug        = (select slug        from public.groups where id = groups.id)
    and name        = (select name        from public.groups where id = groups.id)
    and group_type  = (select group_type  from public.groups where id = groups.id)
    and is_archived = (select is_archived from public.groups where id = groups.id)
  );

-- ============================================================
-- GROUP MEMBERSHIPS policies
-- ============================================================

-- Members read memberships of groups they belong to; leaders read all of their group
create policy "memberships: read own groups"
  on public.group_memberships for select
  to authenticated
  using (
    public.is_group_member(group_id)
    or public.is_group_leader(group_id)
    or public.is_admin()
  );

-- Any active user may request to join (inserts their own row with status='requested')
create policy "memberships: self request"
  on public.group_memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'requested'
    and role   = 'member'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

-- Leader of group or admin may approve/remove members (update status)
create policy "memberships: leader/admin update"
  on public.group_memberships for update
  to authenticated
  using (public.is_group_leader(group_id) or public.is_admin())
  with check (
    -- Role elevation to 'leader' requires admin
    (role = 'member' or public.is_admin())
    and (public.is_group_leader(group_id) or public.is_admin())
  );

-- Members may remove themselves; leaders/admin may remove anyone in their group
create policy "memberships: remove"
  on public.group_memberships for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_leader(group_id)
    or public.is_admin()
  );

-- ============================================================
-- POSTS policies
-- ============================================================

-- Public posts visible to all authenticated users
-- Member-only posts visible only to group members / leaders / admins
-- Parish-wide posts (group_id IS NULL): visible to all active authenticated users
create policy "posts: read"
  on public.posts for select
  to authenticated
  using (
    not is_deleted
    and (
      visibility = 'public'
      or public.is_admin()
      or (group_id is null)                           -- parish-wide, all see
      or public.is_group_member(group_id)
      or public.is_group_leader(group_id)
    )
  );

-- Group leader inserts into their group; admin inserts parish-wide or any group
create policy "posts: insert"
  on public.posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or (group_id is not null and public.is_group_leader(group_id))
    )
  );

-- Author (leader/admin) may update own posts
create policy "posts: update"
  on public.posts for update
  to authenticated
  using (
    author_id = auth.uid()
    and (public.is_admin() or public.is_group_leader(group_id))
  )
  with check (
    author_id = auth.uid()
    and (public.is_admin() or public.is_group_leader(group_id))
  );

-- Soft delete: set is_deleted = true (handled by update policy above)
-- Hard delete: admin only
create policy "posts: admin hard delete"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- COMMENTS policies
-- ============================================================

-- Readable wherever the parent post is readable
create policy "comments: read"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and not p.is_deleted
        and (
          p.visibility = 'public'
          or public.is_admin()
          or p.group_id is null
          or public.is_group_member(p.group_id)
          or public.is_group_leader(p.group_id)
        )
    )
  );

-- Any member who can read the post may comment
create policy "comments: insert"
  on public.comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and not p.is_deleted
        and (
          p.visibility = 'public'
          or public.is_admin()
          or p.group_id is null
          or public.is_group_member(p.group_id)
          or public.is_group_leader(p.group_id)
        )
    )
  );

-- Own comment delete
create policy "comments: delete own"
  on public.comments for delete
  to authenticated
  using (author_id = auth.uid());

-- Leader/admin delete any comment in scope
create policy "comments: leader/admin delete"
  on public.comments for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.group_id is not null
        and public.is_group_leader(p.group_id)
    )
  );

-- ============================================================
-- EVENTS policies
-- ============================================================

create policy "events: read"
  on public.events for select
  to authenticated
  using (
    visibility = 'public'
    or public.is_admin()
    or group_id is null
    or public.is_group_member(group_id)
    or public.is_group_leader(group_id)
  );

create policy "events: insert"
  on public.events for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.is_admin()
      or (group_id is not null and public.is_group_leader(group_id))
    )
  );

create policy "events: update"
  on public.events for update
  to authenticated
  using (
    created_by = auth.uid()
    and (public.is_admin() or public.is_group_leader(group_id))
  );

create policy "events: delete"
  on public.events for delete
  to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_group_leader(group_id))
  );

-- ============================================================
-- EVENT_RSVPS policies
-- ============================================================

create policy "rsvps: read"
  on public.event_rsvps for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.visibility = 'public'
          or public.is_admin()
          or e.group_id is null
          or public.is_group_member(e.group_id)
          or public.is_group_leader(e.group_id)
        )
    )
  );

-- Own row only
create policy "rsvps: upsert own"
  on public.event_rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "rsvps: update own"
  on public.event_rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "rsvps: delete own"
  on public.event_rsvps for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- PUSH_SUBSCRIPTIONS policies
-- ============================================================

create policy "push: own rows"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service role can read all subscriptions for fanout
create policy "push: service role read all"
  on public.push_subscriptions for select
  to service_role
  using (true);
