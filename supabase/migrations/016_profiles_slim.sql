-- Migration 016: Registry-First Restructure — Backfill + Slim Profiles
-- Two-stage: verify between Stage A and Stage B before uncommenting drops.

-- ════════════════════════════════════════════════════════════════
-- STAGE A: Backfill + relocate (SAFE — run first, verify, then B)
-- ════════════════════════════════════════════════════════════════

-- A1. Link profiles that already have a family_members.profile_id reference
update public.profiles p
set    display_name     = fm.full_name,
       family_member_id = fm.id,
       claim_status     = 'approved'
from   public.family_members fm
where  fm.profile_id = p.id;

-- A2. Cache display_name for profiles not yet linked (from old full_name)
update public.profiles
set    display_name = full_name
where  display_name is null
  and  full_name    is not null;

-- A3. Relocate phone_landline → family_units
--     Uses the first linked family member's family to find the unit.
update public.family_units fu
set    phone_landline = p.phone_landline
from   public.profiles p
join   public.family_members fm
       on fm.profile_id = p.id and fm.family_id = fu.id
where  p.phone_landline is not null
  and  fu.phone_landline is null;

-- A4. Relocate email → family_members
update public.family_members fm
set    email = p.email
from   public.profiles p
where  p.id = fm.profile_id
  and  p.email is not null;

-- A5. Move family_photo_url → family_units
update public.family_units fu
set    family_photo_url = p.family_photo_url
from   public.family_members fm
join   public.profiles p on p.id = fm.profile_id
where  fm.family_id = fu.id
  and  p.family_photo_url is not null
  and  fu.family_photo_url is null;

-- A6. Backfill head_member_id from relation_to_head
update public.family_units fu
set    head_member_id = fm.id
from   public.family_members fm
where  fm.family_id = fu.id
  and  lower(coalesce(fm.relation_to_head, '')) in ('head', 'self')
  and  fu.head_member_id is null;
-- Families still without a head: SELECT * FROM family_units WHERE head_member_id IS NULL;
-- → flag for office review before Stage B.

-- A7. Backfill life_event_type_id from existing event_type enum
update public.life_events le
set    life_event_type_id = let.id
from   public.life_event_types let
where  lower(le.event_type) = lower(let.name)
  and  le.life_event_type_id is null;

-- ── VERIFY ALL BEFORE RUNNING STAGE B ────────────────────────
-- Each query must return 0:
--
-- 1. Active profiles missing display_name:
--    SELECT COUNT(*) FROM profiles
--    WHERE status = 'active' AND display_name IS NULL;
--
-- 2. Life events missing type mapping:
--    SELECT COUNT(*) FROM life_events
--    WHERE life_event_type_id IS NULL AND event_type IS NOT NULL;
--
-- 3. Families without a head (flag for office — not a hard block):
--    SELECT id, house_name FROM family_units WHERE head_member_id IS NULL;
-- ─────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════
-- STAGE B: Drop old columns — ONLY after Stage A verified
--          Uncomment and run as a separate SQL execution.
-- ════════════════════════════════════════════════════════════════

-- alter table public.profiles
--   drop column if exists full_name,
--   drop column if exists full_name_ml,
--   drop column if exists house_name,
--   drop column if exists address,
--   drop column if exists date_of_birth,
--   drop column if exists phone_landline,       -- relocated to family_units
--   drop column if exists email,                -- relocated to family_members
--   drop column if exists family_members,       -- JSONB remnant
--   drop column if exists family_photo_url,     -- relocated to family_units
--   drop column if exists is_admin;             -- parish_roles is sole role truth

-- alter table public.life_events
--   drop column if exists event_type;           -- replaced by life_event_type_id FK
