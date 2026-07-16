-- Migration 011: Parish Role System + Change Requests + Audit Log
-- Replaces the flat profiles.is_admin boolean with a proper multi-role system.
-- Backwards-compatible: profiles.is_admin kept until a cleanup migration confirms
-- all code paths migrated; is_admin() helper updated to union both.

-- ============================================================
-- PARISH ROLES
-- ============================================================
create table if not exists public.parish_roles (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles on delete cascade not null,
  role        text not null check (role in ('deacon','treasurer','admin','super_admin')),
  assigned_by uuid references public.profiles not null,
  assigned_at timestamptz not null default now(),
  revoked_by  uuid references public.profiles,
  revoked_at  timestamptz,
  -- one active row per person per role (revoked_at IS NULL means active)
  unique nulls not distinct (profile_id, role, revoked_at)
);

create index if not exists idx_parish_roles_active
  on public.parish_roles (profile_id, role)
  where revoked_at is null;

-- ============================================================
-- HELPER FUNCTIONS (security definer — safe to call from RLS)
-- ============================================================

create or replace function public.has_role(p_role text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.parish_roles
    where profile_id = auth.uid()
      and role = p_role
      and revoked_at is null
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select public.has_role('super_admin');
$$;

create or replace function public.is_admin_or_above()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.parish_roles
    where profile_id = auth.uid()
      and role in ('admin','super_admin')
      and revoked_at is null
  );
$$;

create or replace function public.is_finance()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.parish_roles
    where profile_id = auth.uid()
      and role in ('deacon','treasurer','admin','super_admin')
      and revoked_at is null
  );
$$;

-- Update the existing is_admin() helper to include the new role system
-- (keeps all existing RLS policies working while migration continues)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from public.profiles
     where id = auth.uid() and status = 'active' limit 1),
    false
  )
  or public.is_admin_or_above();
$$;

-- ============================================================
-- CHANGE REQUESTS (maker-checker approval workflow)
-- ============================================================
create table if not exists public.change_requests (
  id              uuid primary key default gen_random_uuid(),
  target_table    text not null,
  target_id       uuid,
  change_type     text not null
                    check (change_type in ('insert','update','delete','reversal')),
  current_data    jsonb,
  proposed_data   jsonb not null,
  requested_by    uuid references public.profiles not null,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.profiles,
  reviewed_at     timestamptz,
  review_remarks  text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_change_requests_pending
  on public.change_requests (created_at desc)
  where status = 'pending';

create index if not exists idx_change_requests_requester
  on public.change_requests (requested_by, created_at desc);

-- ============================================================
-- AUDIT LOG (append-only — no UPDATE/DELETE policies)
-- ============================================================
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles,
  action        text not null,     -- e.g. 'role.assign','change_request.approve','member.disable'
  target_table  text,
  target_id     uuid,
  details       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_log_actor
  on public.audit_log (actor_id, created_at desc);
create index if not exists idx_audit_log_target
  on public.audit_log (target_table, target_id, created_at desc);

-- ============================================================
-- RLS: PARISH ROLES
-- ============================================================
alter table public.parish_roles enable row level security;

create policy "parish_roles: authenticated read"
  on public.parish_roles for select
  to authenticated
  using (true);

create policy "parish_roles: super_admin insert"
  on public.parish_roles for insert
  to authenticated
  with check (public.is_super_admin());

create policy "parish_roles: super_admin update (revoke)"
  on public.parish_roles for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- RLS: CHANGE REQUESTS
-- ============================================================
alter table public.change_requests enable row level security;

create policy "change_requests: read own or admin"
  on public.change_requests for select
  to authenticated
  using (
    requested_by = auth.uid()
    or public.is_super_admin()
    or public.is_admin_or_above()
  );

create policy "change_requests: active member insert"
  on public.change_requests for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

create policy "change_requests: super_admin review"
  on public.change_requests for update
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- RLS: AUDIT LOG (append-only)
-- ============================================================
alter table public.audit_log enable row level security;

create policy "audit_log: read own or super_admin"
  on public.audit_log for select
  to authenticated
  using (actor_id = auth.uid() or public.is_super_admin());

create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  to authenticated
  with check (true);
-- No UPDATE or DELETE policies — enforces append-only

-- ============================================================
-- APPLY_CHANGE_REQUEST stored procedure (super_admin only)
-- Applies proposed_data to the target table in one transaction.
-- Phase 1: only supports profiles updates (extend in future waves).
-- ============================================================
create or replace function public.apply_change_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req change_requests%rowtype;
begin
  -- Verify caller is super_admin
  if not public.is_super_admin() then
    raise exception 'Permission denied — super_admin required';
  end if;

  select * into v_req from change_requests where id = p_request_id;
  if not found then raise exception 'Change request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'Request already processed'; end if;

  -- Apply the change (Phase 1: profiles only)
  if v_req.target_table = 'profiles' then
    update profiles
    set
      full_name          = coalesce((v_req.proposed_data->>'full_name'),     full_name),
      full_name_ml       = coalesce((v_req.proposed_data->>'full_name_ml'),  full_name_ml),
      house_name         = coalesce((v_req.proposed_data->>'house_name'),    house_name),
      address            = coalesce((v_req.proposed_data->>'address'),       address),
      phone_landline     = coalesce((v_req.proposed_data->>'phone_landline'),phone_landline),
      email              = coalesce((v_req.proposed_data->>'email'),         email)
    where id = v_req.target_id;
  end if;

  -- Mark approved
  update change_requests
  set status      = 'approved',
      reviewed_by  = auth.uid(),
      reviewed_at  = now()
  where id = p_request_id;

  -- Audit
  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (
    auth.uid(), 'change_request.approve',
    'change_requests', p_request_id,
    jsonb_build_object('target_table', v_req.target_table, 'target_id', v_req.target_id)
  );
end;
$$;

-- ============================================================
-- DATA MIGRATION: existing is_admin=true → super_admin role rows
-- ============================================================
insert into public.parish_roles (profile_id, role, assigned_by)
select p.id, 'super_admin', p.id
from   public.profiles p
where  p.is_admin = true
  and  not exists (
    select 1 from public.parish_roles pr
    where pr.profile_id = p.id
      and pr.role = 'super_admin'
      and pr.revoked_at is null
  );

-- Write audit rows for the migration-created assignments
insert into public.audit_log (actor_id, action, target_table, target_id, details)
select pr.assigned_by, 'role.assign', 'parish_roles', pr.id,
       jsonb_build_object('role','super_admin','source','migration_011')
from   public.parish_roles pr
where  pr.role = 'super_admin'
  and  pr.assigned_at >= now() - interval '1 minute';  -- only the rows just inserted
