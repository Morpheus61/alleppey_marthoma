-- ============================================================
-- 017 — Event Templates + Calendar enhancements
-- ============================================================

-- ── 1. is_festival + host_family_id on events ────────────
alter table public.events
  add column if not exists is_festival     boolean not null default false;
alter table public.events
  add column if not exists host_family_id  uuid references public.family_units;

-- ── 2. EVENT_TEMPLATES ────────────────────────────────────
create table if not exists public.event_templates (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  name_ml                   text,
  group_id                  uuid references public.groups,
  group_type_hint           text,           -- 'prayer' → asks which Bhagam
  default_time              time,
  default_venue             text,
  default_visibility        text not null default 'public',
  default_reminder_minutes  int  not null default 1440,
  recurrence_suggestion     text,           -- RRULE string, shown as editable default
  requires_host_family      boolean not null default false,
  sort_order                int  not null default 0,
  is_active                 boolean not null default true,
  is_provisional            boolean not null default true,
  created_at                timestamptz not null default now()
);

-- ── 3. RLS ────────────────────────────────────────────────
alter table public.event_templates enable row level security;

create policy "event_templates: authenticated read"
  on public.event_templates for select
  to authenticated using (is_active = true);

create policy "event_templates: admin write"
  on public.event_templates for all
  to authenticated
  using  (public.is_admin_or_above() or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true and status = 'active'))
  with check (public.is_admin_or_above() or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true and status = 'active'));

-- ── 4. SEED TEMPLATES (provisional — pending Vicar confirmation) ──
insert into public.event_templates
  (name, name_ml, group_type_hint, default_time, default_venue, default_visibility, default_reminder_minutes, recurrence_suggestion, sort_order, is_provisional)
values
  ('Holy Qurbana',        'വിശുദ്ധ കുർബാന',   null,     '08:30', 'Church',       'public',  60,   'RRULE:FREQ=WEEKLY;BYDAY=SU', 1, true),
  ('Prayer Meeting',      'പ്രാർഥനായോഗം',     'prayer', '18:30', null,           'members', 1440, 'RRULE:FREQ=WEEKLY',          2, true),
  ('Choir Practice',      'ഗായക സംഘം',        null,     '17:00', 'Church Hall',  'members', 60,   'RRULE:FREQ=WEEKLY',          3, true),
  ('Committee Meeting',   'കമ്മിറ്റി യോഗം',  null,     '19:00', 'Church Office','members', 1440, null,                         4, true),
  ('Festival / Perunnal', 'പെരുന്നാൾ',        null,     '08:00', 'Church',       'public',  1440, null,                         5, true)
on conflict do nothing;

-- ── 5. Admin insert/update/delete on events (legacy is_admin fallback) ──
-- The existing 002_rls_policies policies already cover is_admin() which
-- unions both sources — no new policies needed if is_admin() works.
-- Add explicit super_admin all just in case:
create policy "events: super_admin all"
  on public.events for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());
