-- Migration 013: Finance Module
-- funds, contribution_types, contribution_entries, receipt number sequence

-- ============================================================
-- FUNDS (ledger segregation — not separate bank accounts)
-- ============================================================
create table if not exists public.funds (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  name_ml             text,
  description         text,
  bank_account_label  text,  -- informational only
  is_active           boolean not null default true,
  created_by          uuid references public.profiles not null,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- CONTRIBUTION TYPES (specific collections within a fund)
-- ============================================================
create table if not exists public.contribution_types (
  id                  uuid primary key default gen_random_uuid(),
  fund_id             uuid references public.funds on delete restrict not null,
  name                text not null,
  name_ml             text,
  kind                text not null
                        check (kind in ('subscription','service_offertory','appeal')),
  amount_mode         text not null
                        check (amount_mode in ('fixed','suggested','open')),
  amount              numeric,          -- for fixed/suggested modes
  period_start        date,             -- collection window open
  period_end          date,             -- collection window close; null = open-ended
  service_event_id    uuid references public.events,  -- for service_offertory kind
  target_amount       numeric,
  target_visibility   text not null default 'office'
                        check (target_visibility in ('parish','office')),
  is_active           boolean not null default true,
  created_by          uuid references public.profiles not null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_contribution_types_fund
  on public.contribution_types (fund_id, is_active);
create index if not exists idx_contribution_types_window
  on public.contribution_types (period_start, period_end)
  where is_active;

-- ============================================================
-- RECEIPT NUMBER TABLE (sequential, safe under concurrency)
-- ============================================================
create table if not exists public.receipt_counters (
  id      text primary key default 'main',
  last_no bigint not null default 0
);
insert into public.receipt_counters (id, last_no) values ('main', 0)
on conflict (id) do nothing;

-- Function to claim the next receipt number (advisory-locked for concurrency safety)
create or replace function public.next_receipt_number()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next   bigint;
begin
  -- Advisory lock to serialise concurrent claims
  perform pg_advisory_xact_lock(hashtext('receipt_counter'));

  update receipt_counters set last_no = last_no + 1 where id = 'main'
  returning last_no into v_next;

  select value into v_prefix from app_settings where key = 'receipt_prefix';
  v_prefix := coalesce(v_prefix, 'SGM-D-');

  return v_prefix || lpad(v_next::text, 5, '0');
end;
$$;

-- ============================================================
-- CONTRIBUTION ENTRIES
-- ============================================================
create table if not exists public.contribution_entries (
  id                    uuid primary key default gen_random_uuid(),
  contribution_type_id  uuid references public.contribution_types on delete restrict not null,
  family_id             uuid references public.family_units on delete restrict not null,
  member_id             uuid references public.family_members,  -- null for family-level types
  amount                numeric not null check (amount > 0),
  channel               text not null
                          check (channel in ('upi_declared','cash','neft_declared')),
  period_month          date,      -- for subscription kind: first day of the month it pays
  utr                   text,      -- UPI/NEFT reference number
  screenshot_path       text,      -- path in 'payment-proofs' private bucket
  status                text not null default 'submitted'
                          check (status in ('submitted','verified','rejected','reversed')),
  receipt_number        text unique,  -- assigned at verification (or at cash entry)
  recorded_by           uuid references public.profiles not null,
  verified_by           uuid references public.profiles,
  verified_at           timestamptz,
  reject_reason         text,
  reversal_of           uuid references public.contribution_entries,  -- corrections chain
  created_at            timestamptz not null default now()
);

-- Prevent one UTR paying twice (partial index: UTR uniqueness only when set)
create unique index if not exists uq_contribution_utr
  on public.contribution_entries (utr)
  where utr is not null;

create index if not exists idx_contribution_family
  on public.contribution_entries (family_id, created_at desc);
create index if not exists idx_contribution_status
  on public.contribution_entries (status, created_at desc)
  where status = 'submitted';
create index if not exists idx_contribution_type_month
  on public.contribution_entries (contribution_type_id, period_month);

-- ============================================================
-- STORAGE BUCKET: payment-proofs (private)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false,
  10485760,  -- 10 MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- Finance roles can read any proof; submitting family can read their own
create policy "payment-proofs: finance read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      public.is_finance()
      -- Family reads their own: path prefix = family_id
      or (storage.foldername(name))[1]::uuid in (
        select fu.id from public.family_units fu
        join   public.family_members fm on fm.family_id = fu.id
        where  fm.profile_id = auth.uid()
      )
    )
  );

-- Members can upload to their own family folder
create policy "payment-proofs: family insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1]::uuid in (
      select fu.id from public.family_units fu
      join   public.family_members fm on fm.family_id = fu.id
      where  fm.profile_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: assign receipt number on cash entry or verification
-- ============================================================
create or replace function public.assign_receipt_on_verify()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- Assign receipt when: status moves to 'verified' and no receipt yet
  if new.status = 'verified' and new.receipt_number is null then
    new.receipt_number := public.next_receipt_number();
    new.verified_at    := now();

    -- Audit
    insert into public.audit_log (actor_id, action, target_table, target_id, details)
    values (
      auth.uid(), 'contribution.verified',
      'contribution_entries', new.id,
      jsonb_build_object('receipt', new.receipt_number, 'amount', new.amount)
    );
  end if;
  return new;
end;
$$;

create trigger trg_assign_receipt
  before update of status on public.contribution_entries
  for each row execute function public.assign_receipt_on_verify();

-- Audit on INSERT (new submission)
create or replace function public.audit_contribution_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values (
    auth.uid(), 'contribution.submitted',
    'contribution_entries', new.id,
    jsonb_build_object('channel', new.channel, 'amount', new.amount, 'status', new.status)
  );
  return new;
end;
$$;

create trigger trg_audit_contribution_insert
  after insert on public.contribution_entries
  for each row execute function public.audit_contribution_insert();

-- ============================================================
-- RLS: FUNDS
-- ============================================================
alter table public.funds enable row level security;

create policy "funds: finance read"
  on public.funds for select
  to authenticated
  using (public.is_finance());

-- All authenticated members read active funds (for member payment UI)
create policy "funds: member read active"
  on public.funds for select
  to authenticated
  using (is_active = true);

create policy "funds: super_admin write"
  on public.funds for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- RLS: CONTRIBUTION TYPES
-- ============================================================
alter table public.contribution_types enable row level security;

create policy "contribution_types: member read active"
  on public.contribution_types for select
  to authenticated
  using (is_active = true);

create policy "contribution_types: finance read all"
  on public.contribution_types for select
  to authenticated
  using (public.is_finance());

create policy "contribution_types: super_admin write"
  on public.contribution_types for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- RLS: CONTRIBUTION ENTRIES
-- ============================================================
alter table public.contribution_entries enable row level security;

-- Finance roles: read all entries
create policy "contribution_entries: finance read"
  on public.contribution_entries for select
  to authenticated
  using (public.is_finance());

-- Family: read their own entries
create policy "contribution_entries: family read own"
  on public.contribution_entries for select
  to authenticated
  using (
    family_id in (
      select fu.id from public.family_units fu
      join   public.family_members fm on fm.family_id = fu.id
      where  fm.profile_id = auth.uid()
    )
  );

-- Member submits their own entry (UPI/NEFT declaration)
create policy "contribution_entries: member submit"
  on public.contribution_entries for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and channel in ('upi_declared','neft_declared')
    and status = 'submitted'
    -- must be from own family
    and family_id in (
      select fu.id from public.family_units fu
      join   public.family_members fm on fm.family_id = fu.id
      where  fm.profile_id = auth.uid()
    )
  );

-- Deacon/finance: insert cash entries (any family)
create policy "contribution_entries: finance insert cash"
  on public.contribution_entries for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and public.is_finance()
  );

-- Treasurer/admin/super_admin: verify or reject entries
create policy "contribution_entries: treasurer verify"
  on public.contribution_entries for update
  to authenticated
  using (
    exists (
      select 1 from public.parish_roles
      where profile_id = auth.uid()
        and role in ('treasurer','admin','super_admin')
        and revoked_at is null
    )
  )
  with check (
    -- can only change status (verify/reject); amounts immutable
    amount = (select amount from public.contribution_entries where id = contribution_entries.id)
  );

-- ============================================================
-- RLS: RECEIPT COUNTERS
-- ============================================================
alter table public.receipt_counters enable row level security;

create policy "receipt_counters: service only"
  on public.receipt_counters for all
  to service_role
  using (true);
-- next_receipt_number() is security definer — no direct user access needed

-- ============================================================
-- SEED: CONFIG PLACEHOLDER — Vicar replaces via UI after launch
-- ============================================================
-- ⛪CONFIG-2: Vicar fills config/funds.example.json and runs the import script.
-- See config/funds.example.json for the schema.
