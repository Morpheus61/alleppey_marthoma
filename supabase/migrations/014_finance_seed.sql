-- Migration 014: Finance Seed Data
-- Default funds and contribution types for St. George Marthoma Church, Alappuzha
--
-- ⚠️  DEFAULTS — all rows pending Vicar (super_admin) confirmation.
--     Every row is editable and archivable by super_admin via the Finance UI.
--     Run AFTER migrations 011, 012, 013 and AFTER at least one super_admin
--     role row exists in parish_roles.
--
-- To re-run safely: uses WHERE NOT EXISTS guards; no duplicates on re-run.

do $$
declare
  v_admin_id   uuid;
  v_general_id uuid;
  v_charity_id uuid;
begin

  -- ── Resolve creator ID ────────────────────────────────────────────────────
  -- Use first active super_admin; fall back to any is_admin profile
  select profile_id into v_admin_id
  from   public.parish_roles
  where  role = 'super_admin' and revoked_at is null
  order  by assigned_at
  limit  1;

  if v_admin_id is null then
    select id into v_admin_id
    from   public.profiles
    where  is_admin = true and status = 'active'
    limit  1;
  end if;

  if v_admin_id is null then
    raise notice
      '014_finance_seed: no super_admin or admin profile found. '
      'Grant a super_admin role first, then re-run this migration.';
    return;
  end if;

  -- ── FUND 1: General Fund ──────────────────────────────────────────────────
  -- ⛪ DEFAULT — Vicar to confirm name / description
  if not exists (select 1 from public.funds where name = 'General Fund') then
    insert into public.funds (name, name_ml, description, is_active, created_by)
    values (
      'General Fund',
      'പൊതു ഫണ്ട്',
      'General parish operations, maintenance, and regular collections. '
        '⛪ DEFAULTS — edit via Admin → Finance → Collections.',
      true, v_admin_id
    )
    returning id into v_general_id;
  else
    select id into v_general_id from public.funds where name = 'General Fund' limit 1;
  end if;

  -- ── FUND 2: Charity & Palliative Fund ────────────────────────────────────
  -- ⛪ DEFAULT — Vicar to confirm name / description
  if not exists (select 1 from public.funds where name = 'Charity & Palliative Fund') then
    insert into public.funds (name, name_ml, description, is_active, created_by)
    values (
      'Charity & Palliative Fund',
      'ചാരിറ്റി & ശൂശ്രൂഷ ഫണ്ട്',
      'Pain & Palliative Care unit and charitable activities of the parish. '
        '⛪ DEFAULTS — edit via Admin → Finance → Collections.',
      true, v_admin_id
    )
    returning id into v_charity_id;
  else
    select id into v_charity_id
    from   public.funds
    where  name = 'Charity & Palliative Fund'
    limit  1;
  end if;

  -- ── CONTRIBUTION TYPE 1: Masavari ─────────────────────────────────────────
  -- Monthly family subscription — fixed ₹300 by default.
  -- ⛪ DEFAULT amount: ₹300 / family / month — Vicar to confirm.
  -- kind = 'subscription' → period_month field tracks which month is paid.
  -- No window (period_start / period_end both null) → ongoing.
  if not exists (
    select 1 from public.contribution_types
    where name = 'Masavari' and fund_id = v_general_id
  ) then
    insert into public.contribution_types (
      fund_id, name, name_ml, kind, amount_mode, amount,
      period_start, period_end, target_visibility, is_active, created_by
    ) values (
      v_general_id,
      'Masavari', 'മാസവരി',
      'subscription', 'fixed', 300,
      null, null,           -- ongoing — no collection window
      'office', true, v_admin_id
    );
  end if;

  -- ── CONTRIBUTION TYPE 2: Sunday Offertory ────────────────────────────────
  -- Day-total entry by office/deacon only — NEVER per-member.
  -- kind = 'service_offertory' signals UI to restrict to day-total entry.
  -- ⛪ DEFAULT — Vicar to confirm fund assignment.
  if not exists (
    select 1 from public.contribution_types
    where name = 'Sunday Offertory' and fund_id = v_general_id
  ) then
    insert into public.contribution_types (
      fund_id, name, name_ml, kind, amount_mode,
      period_start, period_end, target_visibility, is_active, created_by
    ) values (
      v_general_id,
      'Sunday Offertory', 'ഞായറാഴ്ച സ്തോത്രകാഴ്ച',
      'service_offertory', 'open',
      null, null,           -- ongoing
      'office', true, v_admin_id
    );
  end if;

  -- ── CONTRIBUTION TYPE 3: Birthday Thanksgiving ───────────────────────────
  -- Open appeal, any amount, ongoing.
  -- ⛪ DEFAULT — Vicar to confirm.
  if not exists (
    select 1 from public.contribution_types
    where name = 'Birthday Thanksgiving' and fund_id = v_general_id
  ) then
    insert into public.contribution_types (
      fund_id, name, name_ml, kind, amount_mode,
      period_start, period_end, target_visibility, is_active, created_by
    ) values (
      v_general_id,
      'Birthday Thanksgiving', 'ജന്മദിന സ്തോത്രകാഴ്ച',
      'appeal', 'open',
      null, null,           -- ongoing
      'office', true, v_admin_id
    );
  end if;

  -- ── CONTRIBUTION TYPE 4: Wedding Anniversary Thanksgiving ────────────────
  -- Open appeal, any amount, ongoing.
  -- ⛪ DEFAULT — Vicar to confirm.
  if not exists (
    select 1 from public.contribution_types
    where name = 'Wedding Anniversary Thanksgiving' and fund_id = v_general_id
  ) then
    insert into public.contribution_types (
      fund_id, name, name_ml, kind, amount_mode,
      period_start, period_end, target_visibility, is_active, created_by
    ) values (
      v_general_id,
      'Wedding Anniversary Thanksgiving', 'വിവാഹ വാർഷിക സ്തോത്രകാഴ്ച',
      'appeal', 'open',
      null, null,           -- ongoing
      'office', true, v_admin_id
    );
  end if;

  -- ── CONTRIBUTION TYPE 5: Building Fund campaign ──────────────────────────
  -- Open appeal, target ₹5,00,000, progress bar visible to all members.
  -- Archive this row when the campaign closes (Admin → Finance → Collections).
  -- ⛪ DEFAULT target: ₹5,00,000 — Vicar to confirm or edit.
  if not exists (
    select 1 from public.contribution_types
    where name = 'Building Fund' and fund_id = v_general_id
  ) then
    insert into public.contribution_types (
      fund_id, name, name_ml, kind, amount_mode,
      period_start, period_end,
      target_amount, target_visibility,
      is_active, created_by
    ) values (
      v_general_id,
      'Building Fund', 'നിർമ്മാണ ഫണ്ട്',
      'appeal', 'open',
      null, null,           -- no fixed window; Vicar sets period_end when closing
      500000, 'parish',     -- ⛪ DEFAULT target; progress bar shown to all members
      true, v_admin_id
    );
  end if;

  raise notice '014_finance_seed: seed complete (creator: %)', v_admin_id;
end;
$$;
