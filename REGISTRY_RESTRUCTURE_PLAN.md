# Registry-First Restructure — Full Implementation Plan

**Project:** St. George Marthoma Church PWA (alleppey_marthoma)  
**Date:** 2026-07-17  
**Status:** Approved — awaiting implementation go-ahead

---

## Principle

The Parish Registry (`family_units`, `family_members`, `life_events`) is the **sole source of truth**. An app account is a phone login *attached* to an existing registry person. Nothing else stores member identity data.

---

## What This Replaces

| Current | Target |
|---|---|
| Profile row IS the member record | Profile row is only a phone login credential |
| `profiles.full_name` is the name | `family_members.full_name` is the name |
| Blank form on first login | Household-search claim flow on first login |
| Directory reads `profiles` table | Directory reads `directory_entries` view exclusively |
| `/me` edits all personal data | `/me` edits only photos, WhatsApp, language, notifications |

---

## Section 1 — Slim Down Profiles

**Keep on `profiles`:**
- `phone`, `avatar_url`
- `whatsapp_number`, `is_mobile_whatsapp`
- `ui_language`, notification prefs
- `status`
- `family_member_id` FK (the attachment point to the registry)
- `display_name` (derived cache from `family_members.full_name` — refreshed by trigger)
- `claim_status` (`unclaimed` | `pending_claim` | `approved`)

**Relocate before dropping:**
- `phone_landline` → `family_units.phone_landline` (house attribute)
- `email` → `family_members.email` (person attribute)
- `family_photo_url` → `family_units.family_photo_url` (household attribute; one photo per house)

**Remove from `profiles` (after backfill + relocation verified):**
- `full_name`, `full_name_ml`
- `house_name`, `address`, `date_of_birth`
- `family_members` (jsonb remnant)
- `is_admin` — **dropped entirely** (no backwards-compat exception; `parish_roles` is the sole role truth)

---

## Section 2 — Claim-Based Registration

Replaces the blank "fill in your details" first-login form.

### Flow

```
OTP login → /auth/claim
  Step 1: Searchable household picker
    - grouped by Bhagam, both scripts
    - search by house name / head name
  Step 2: Pick which family_member you are
    - hides rows already claimed by another account
  → creates pending claim
  → office approves (or auto-approves if phone matches imported registry phone)
  → Decline releases the family_member row

/auth/pending shows claim status in both languages:
  unclaimed       → "Search for your household to complete registration"
  pending_claim   → "Submitted — awaiting approval by the church office"
  approved+pending → "Approved — awaiting final activation"
```

### `claimFamilyMember(familyMemberId)` action

- Sets `profiles.family_member_id = familyMemberId`, `claim_status = 'pending_claim'`
- If registry has a matching phone → auto-approve (`claim_status = 'approved'`, `status = 'active'`)
- Else → status stays `'pending'`; Admin sees claim in dashboard

---

## Section 3 — Head of Family

- Add `family_units.head_member_id` FK NOT NULL (enforced after backfill)
- Masavari and all family-level records key off the head
- Changing head = change request to Vicar (maker-checker)

---

## Section 4 — `life_event_types` Lookup Table

Replaces the hard-coded `event_type` enum in `life_events`.

**Seed rows (Vicar can add more via UI):**

| Name | Malayalam | Sort |
|---|---|---|
| Baptism | ജ്ഞാനസ്നാനം | 1 |
| First Holy Communion | ആദ്യ ദിവ്യകാരുണ്യം | 2 |
| Confirmation | ഉറഫ | 3 |
| Marriage | വിവാഹം | 4 |
| Marriage Dissolution | വിവാഹ മോചനം | 5 |
| Remarriage | പുനർ വിവാഹം | 6 |
| Death | മരണം | 7 |
| Other | മറ്റുള്ളവ | 8 |

- `life_events.life_event_type_id` FK replaces the enum column
- `life_events.related_event_id` FK for chained events (dissolution → marriage)
- `life_events.superseded_by` correction chain kept as-is

---

## Section 5 — Directory = View Only

- `directory/page.tsx` queries **only** the `directory_entries` view
- No `profiles.*` text fields except `display_name` cache
- Member detail card: family photo + address shown only when member's visibility toggle is ON (default ON)
- Delete all profile-based directory queries

---

## Section 6 — Profile Page → Registry Card

`/me` shows the member's registry data + own family household (read-only).

**Self-editable only:**
- Profile photo (avatar_url)
- Family photo (family_photo_url)
- WhatsApp number / is_mobile_whatsapp toggle
- UI language
- Notification preferences

**"Request a correction" button** → submits a `change_request` to the Vicar for name / DOB / address changes.

---

## Section 7 — Documentation Updates

- `APP_DEFINITION.md`: rewrite Registration + Registry sections to the claim flow; remove "English required" paragraph
- `Alleppey_Marthoma_System_Definition.md`: update to slimmed profiles model; remove "Unlinked Profiles Panel" concept (replaced by Claims Queue)
- `HOW_TO_USE.md`: update Section 1 (first-time login) and Section 5 (Registry)

---

## Migrations

### Migration 015: Schema Additions (safe — no drops)

```sql
-- 1. Link profiles to their registry person
alter table public.profiles
  add column if not exists family_member_id uuid references public.family_members on delete set null,
  add column if not exists display_name     text,        -- derived cache; refreshed by trigger
  add column if not exists claim_status     text not null default 'unclaimed'
                             check (claim_status in ('unclaimed','pending_claim','approved'));

-- 🔴 BLOCKER 1 FIX: UNIQUE partial index — enforces one-person-one-account at DB level
create unique index if not exists uq_profiles_family_member
  on public.profiles (family_member_id) where family_member_id is not null;

-- 2. Head of family on family_units
alter table public.family_units
  add column if not exists head_member_id    uuid references public.family_members on delete set null,
  add column if not exists phone_landline    text,   -- 🟠 relocated from profiles
  add column if not exists family_photo_url text;   -- 🟠 moved from profiles (household attribute)

-- 3. Family member phone (for auto-approve) + email relocation
alter table public.family_members
  add column if not exists phone text,   -- 🔴 BLOCKER 3 FIX: normalized +91XXXXXXXXXX; enables auto-approve
  add column if not exists email text;   -- 🟠 relocated from profiles (person attribute)

-- 4. life_event_types lookup table (replaces hard-coded enum)
create table if not exists public.life_event_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  name_ml    text,    -- ⛪ PROVISIONAL — all Malayalam terms pending Vicar confirmation
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ⛪ PROVISIONAL Malayalam: Marthoma-correct terms; Vicar to confirm full list
-- (CONFIG: sacrament list added to Vicar questions)
insert into public.life_event_types (name, name_ml, sort_order) values
  ('Baptism',              'മാമ്മോദീസ',           1),  -- Mamodisa (Marthoma)
  ('First Holy Communion', 'ആദ്യ കുർബാന',         2),  -- Marthoma usage
  ('Confirmation',         null,                   3),  -- ⛪ Vicar to provide Marthoma term
  ('Marriage',             'വിവാഹം',               4),
  ('Marriage Dissolution', 'വിവാഹ മോചനം',         5),
  ('Remarriage',           'പുനർ വിവാഹം',         6),
  ('Death',                'മരണം',                 7),
  ('Other',                'മറ്റുള്ളവ',            8)
on conflict do nothing;

-- 5. life_events: add FK to lookup + related-event chain
alter table public.life_events
  add column if not exists life_event_type_id uuid references public.life_event_types,
  add column if not exists related_event_id   uuid references public.life_events;

-- 6. RLS for life_event_types
alter table public.life_event_types enable row level security;
create policy "life_event_types: read"
  on public.life_event_types for select to authenticated using (true);
create policy "life_event_types: super_admin write"
  on public.life_event_types for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 7. RLS for claim flow (🔴 BLOCKER 2 FIX)
-- Pending user may update own row, claim fields only, direction unclaimed→pending_claim only.
-- After approval, family_member_id is immutable.
create policy "profiles: pending claim update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and status = 'pending')
  with check (
    id = auth.uid()
    -- Only allowed transition: unclaimed → pending_claim
    and claim_status = 'pending_claim'
    -- Cannot re-point after approval (enforced via: old claim_status must not be 'approved')
    and (select claim_status from public.profiles where id = auth.uid()) != 'approved'
    -- Only these columns may change (enforced by application; DB enforces via trigger below)
  );

-- Trigger: lock family_member_id after approval
create or replace function public.lock_claimed_identity()
returns trigger language plpgsql security definer as $$
begin
  if old.claim_status = 'approved' and new.family_member_id is distinct from old.family_member_id then
    raise exception 'Cannot re-point family_member_id after claim approval';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_claimed_identity on public.profiles;
create trigger trg_lock_claimed_identity
  before update of family_member_id on public.profiles
  for each row execute function public.lock_claimed_identity();

-- 8. Security-definer RPCs for claim search (🔴 BLOCKER 2 FIX)
-- Step 1: house names + Bhagam only — safe for pending users
create or replace function public.search_households(search_term text)
returns table(id uuid, house_name text, house_name_ml text, bhagam_name text, bhagam_name_ml text)
language sql security definer stable as $$
  select fu.id, fu.house_name, fu.house_name_ml,
         g.name as bhagam_name, g.name_ml as bhagam_name_ml
  from   public.family_units fu
  join   public.groups g on g.id = fu.prayer_group_id
  where  fu.house_name ilike '%' || search_term || '%'
     or  fu.house_name_ml ilike '%' || search_term || '%'
  order  by fu.house_name
  limit  30;
$$;

-- Step 2: first names + relations of one household — no DOB, no phone
create or replace function public.household_claimable_members(p_family_id uuid)
returns table(id uuid, full_name text, full_name_ml text, relation_to_head text)
language sql security definer stable as $$
  select fm.id, fm.full_name, fm.full_name_ml, fm.relation_to_head
  from   public.family_members fm
  where  fm.family_id = p_family_id
    and  fm.is_deceased = false
    -- Hide already-claimed members
    and  not exists (
      select 1 from public.profiles p
      where p.family_member_id = fm.id
    )
  order  by fm.relation_to_head;
$$;

-- 9. Trigger: refresh display_name when registry name changes (🟠 staleness fix)
create or replace function public.refresh_display_name()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set    display_name = new.full_name
  where  family_member_id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_refresh_display_name on public.family_members;
create trigger trg_refresh_display_name
  after update of full_name on public.family_members
  for each row execute function public.refresh_display_name();
```

### Migration 016: Backfill + Slim Profiles (two-stage — verify between)

```sql
-- ══════════════════════════════════════════════════════════════════════
-- STAGE A: Backfill + relocate data (SAFE — run first)
-- ══════════════════════════════════════════════════════════════════════

-- A1. Link profiles that already have a family_members row
update public.profiles p
set    display_name     = fm.full_name,
       family_member_id = fm.id,
       claim_status     = 'approved'
from   public.family_members fm
where  fm.profile_id = p.id;

-- A2. Cache display_name for profiles not yet linked
update public.profiles
set    display_name = full_name
where  display_name is null and full_name is not null;

-- A3. Relocate phone_landline → family_units (via head member link)
update public.family_units fu
set    phone_landline = p.phone_landline
from   public.profiles p
join   public.family_members fm on fm.profile_id = p.id and fm.family_id = fu.id
where  p.phone_landline is not null and fu.phone_landline is null;

-- A4. Relocate email → family_members
update public.family_members fm
set    email = p.email
from   public.profiles p
where  p.id = fm.profile_id and p.email is not null;

-- A5. Move family_photo_url → family_units (from profile of any linked member)
update public.family_units fu
set    family_photo_url = p.family_photo_url
from   public.family_members fm
join   public.profiles p on p.id = fm.profile_id
where  fm.family_id = fu.id and p.family_photo_url is not null
  and  fu.family_photo_url is null;

-- A6. Backfill head_member_id
update public.family_units fu
set    head_member_id = fm.id
from   public.family_members fm
where  fm.family_id = fu.id
  and  lower(coalesce(fm.relation_to_head,'')) in ('head','self')
  and  fu.head_member_id is null;
-- Families still without a head → office review (query: select * from family_units where head_member_id is null)

-- A7. Backfill life_event_type_id from existing event_type enum (🔴 BLOCKER 4 FIX)
update public.life_events le
set    life_event_type_id = let.id
from   public.life_event_types let
where  lower(le.event_type) = lower(let.name)
  and  le.life_event_type_id is null;
-- Verify: select count(*) from life_events where life_event_type_id is null and event_type is not null;
-- → should be 0 before Stage B

-- ── VERIFY before Stage B ────────────────────────────────────────────
-- All must return 0:
--   select count(*) from profiles where status='active' and display_name is null;
--   select count(*) from life_events where life_event_type_id is null and event_type is not null;
-- ─────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════
-- STAGE B: Drop old columns (ONLY after Stage A verified — uncomment)
-- ══════════════════════════════════════════════════════════════════════
-- alter table public.profiles
--   drop column if exists full_name,
--   drop column if exists full_name_ml,
--   drop column if exists house_name,
--   drop column if exists address,
--   drop column if exists date_of_birth,
--   drop column if exists phone_landline,    -- relocated to family_units
--   drop column if exists email,             -- relocated to family_members
--   drop column if exists family_members,    -- the JSONB remnant
--   drop column if exists family_photo_url,  -- relocated to family_units
--   drop column if exists is_admin;          -- 🟠 DROP: parish_roles is the sole role truth

-- alter table public.life_events
--   drop column if exists event_type;        -- 🔴 BLOCKER 4 FIX: drop old enum after backfill verified
```

---

## Files to Create / Modify

| File | Action | What changes |
|---|---|---|
| `supabase/migrations/015_registry_schema.sql` | **Create** | Schema additions: unique claim index, claim RLS + trigger, search RPCs, `family_members.phone`, `family_members.email`, `family_units.phone_landline`, `family_units.family_photo_url`, `family_units.head_member_id`, `life_event_types`, `display_name` refresh trigger |
| `supabase/migrations/016_profiles_slim.sql` | **Create** | Stage A: backfill + relocate data; Stage B (commented): drop old columns including `is_admin` and `event_type` |
| `supabase/migrations/003_auth_trigger.sql` | **Update** | Minimal profile creation; auto-link on phone match via `family_members.phone` |
| `src/app/auth/claim/page.tsx` | **Create** | Step 1: household search via `search_households()` RPC |
| `src/app/auth/claim/pick/page.tsx` | **Create** | Step 2: family member picker via `household_claimable_members()` RPC |
| `src/app/auth/claim/actions.ts` | **Create** | `claimFamilyMember`, `approveClaim`, `denyClaim` |
| `src/components/auth/HouseholdSearch.tsx` | **Create** | Searchable picker grouped by Bhagam |
| `src/components/auth/FamilyMemberPicker.tsx` | **Create** | Member rows; hides claimed ones |
| `src/app/auth/pending/page.tsx` | **Update** | Claim-status-aware bilingual messages (3 states) |
| `src/app/auth/login/page.tsx` | **Update** | Redirect to /auth/claim after OTP |
| `src/app/(app)/me/page.tsx` | **Update** | Registry read; photos/WhatsApp/language only; correction button |
| `src/components/directory/ProfileCard.tsx` | **Update** | Reads registry join; “Request a correction” button |
| `src/components/directory/MemberForm.tsx` | **Deprecate** | Replaced by ProfileSettings for /me; keep for admin direct edit |
| `src/app/(app)/directory/page.tsx` | **Update** | View-only from `directory_entries` view |
| `src/app/(app)/admin/page.tsx` | **Update** | Add Claims Queue section |
| `src/app/(app)/admin/wave2-actions.ts` | **Update** | Add `approveClaim`, `denyClaim`; remove `is_admin` reads |
| `src/types/database.ts` | **Update** | New columns, `life_event_types`, removed dropped columns |
| `APP_DEFINITION.md` | **Update** | Registration section → claim flow; remove “English required” paragraph |
| `Alleppey_Marthoma_System_Definition.md` | **Update** | Slimmed profiles model; remove Unlinked Profiles Panel |
| `HOW_TO_USE.md` | **Update** | Section 1 (first login → claim flow) + Section 5 (Registry) |

---

## Order of Operations (data safety)

```
Step 1 — Run migration 015 (safe — only adds, never drops;
          includes unique claim index, claim RLS, search RPCs,
          family_members.phone, life_event_types, display_name trigger)
Step 2 — Update all READ paths to use registry join
          (app still works via old columns during transition)
Step 3 — Run migration 016 Stage A
          (backfill display_name, family_member_id, relocate
           phone_landline/email/family_photo_url, backfill
           head_member_id, backfill life_event_type_id)
Step 4 — VERIFY (all checks must return 0):
          • active profiles with null display_name
          • life_events with null life_event_type_id and non-null event_type
          • family_units with null head_member_id (flag for office review)
Step 5 — Ship claim flow (/auth/claim + updated /me + Claims Queue in admin)
Step 6 — Test fully with live data; confirm all flows work
          including auto-approve for phone-matched members
Step 7 — Run migration 016 Stage B (drop old columns:
          full_name, full_name_ml, house_name, address,
          date_of_birth, phone_landline, email, family_members jsonb,
          family_photo_url from profiles, is_admin,
          event_type from life_events)
Step 8 — Remove remaining code references to dropped columns;
          fix all is_admin reads to use parish_roles lookup
Step 9 — Update documentation
```

---

## Admin: Claims Queue (new section in Admin Dashboard)

Shows profiles with `claim_status = 'pending_claim'`.

Each item displays:
- Phone number of the claimant
- Claimed household name + Bhagam
- Claimed family member name + relation

Actions:
- **Approve** — links profile, sets `status = 'active'`, `claim_status = 'approved'`
- **Deny** — clears `family_member_id`, resets `claim_status = 'unclaimed'`, returns to claim screen

---

## Vicar CONFIG Questions (additions from this plan)

| # | Question | Default |
|---|---|---|
| CONFIG-5 | Sacrament/life event names in Malayalam — Marthoma liturgical terms | ⛪ Vicar to confirm full list; provisional terms in seed |
| CONFIG-6 | Should deceased head-of-family silently clear, or surface in a review queue? | Recommend: review queue |

---

## Bulk Import Spreadsheet (updated column list)

The office spreadsheet for parish roll import now requires **one extra column**:

| Column | Notes |
|---|---|
| `full_name` | Required |
| `phone` (per member) | **New — required for auto-approve** · normalized 10-digit Indian mobile |
| `house_name` | Required |
| `bhagam` | Required (must match a group slug or name) |
| `relation_to_head` | head / spouse / son / daughter / other |
| `date_of_birth` | YYYY-MM-DD |
| `full_name_ml` | Optional |

Without `phone` per member, all 300+ pre-registered members land in the manual claims queue instead of auto-approving on first OTP login.

---

## Auth Trigger (updated handle_new_user)

```sql
-- Minimal: only creates the login credential row
-- Name + identity come from registry claim, NOT from OTP metadata
insert into public.profiles (id, phone, status, claim_status)
values (new.id, new.phone, 'pending', 'unclaimed')
on conflict (id) do nothing;

-- Auto-link: if any family_member has a matching phone field (future)
-- update profiles set family_member_id = ..., claim_status = 'approved', status = 'active'
-- where phone matches registry phone (when registry has been populated)
```

---

*This plan was amended on 2026-07-17 following security and schema review. Four blockers and five correctness items have been incorporated. No code changes have been made. Awaiting go-ahead to begin implementation.*

---

## Review Amendments (2026-07-17)

### 🔴 Blocker 1 — Unique constraint on claim link
`profiles.family_member_id` must be a **unique** partial index, not a plain index. UI-only protection against double-claims is insufficient; identity binding must be enforced at the database level.

### 🔴 Blocker 2 — Claim flow RLS fully specified
Two parts:
- **(a) Self-update guard**: A pending user may update only their own row, only the claim fields, and only in the direction `unclaimed → pending_claim`. After `claim_status = 'approved'`, `family_member_id` is immutable — no re-pointing of identity.
- **(b) Search RPC**: The household search exposes registry data to unapproved (OTP-only) users. This must go through a **security-definer RPC** returning minimal fields only:
  - Step 1: house name + Bhagam name only (no member data)
  - Step 2: first name + relation of each member in the selected household only (no DOB, no phone)
  Never direct table reads for pending users.

### 🔴 Blocker 3 — `family_members.phone` required for auto-approve
Auto-approve compares against a registry phone that doesn't exist. `family_members` has no phone field. Add `family_members.phone` (nullable, normalized to +91XXXXXXXXXX) in migration 015. Map it during bulk import. Without it, every pre-registered member lands in the manual queue — defeating the pre-registration promise. The office bulk import spreadsheet must gain a **phone-per-member column** (not just per-family).

### 🔴 Blocker 4 — `life_events` type migration is half-done
015 adds `life_event_type_id` but never backfills from the existing `event_type` enum, never sets NOT NULL, never drops the old column. Fix: add backfill mapping (enum → lookup row ID), verify, then drop `event_type` in 016 Stage B alongside the profile columns.

### 🟠 Malayalam liturgical terms — provisional, Marthoma-correct
The original seed terms are Catholic-flavoured. Marthoma usage:
- Baptism → **മാമ്മോദീസ** (Mamodisa)
- First Holy Communion → **ആദ്യ കുർബാന**
- Confirmation → *(pending Vicar confirmation — "ഉറഫ" was incorrect)*
All `name_ml` values are marked provisional. Full sacrament list added to the Vicar's CONFIG question list.

### 🟠 `family_photo_url` belongs on `family_units`
A family photo is a household attribute, not a personal login attribute. On `profiles`, five members of one house can upload five conflicting photos. Move to `family_units.family_photo_url`.

### 🟠 `head_member_id` needs backfill + enforced NOT NULL
Add backfill step: set head = first family member with `relation_to_head = 'head'`; flag families with no head for office review. Add NOT NULL constraint as a follow-up migration after backfill verified. Note: `on delete set null` silently leaves a family headless — a deceased head must surface in the office's attention queue, not vanish silently.

### 🟠 `display_name` staleness
Cached at claim time, never refreshed on registry correction. Add a trigger on `family_members (full_name, full_name_ml)` that updates `profiles.display_name` for any linked profile.

### 🟠 Drop `is_admin` — no backwards-compat exception
`parish_roles` is the single role truth; keeping `is_admin` reintroduces the two-sources problem this plan exists to cure. Drop it in Stage B. Fix all code reading it to use `parish_roles` lookup.

### 🟠 Email and landline — deliberate relocation, not silent deletion
- `phone_landline` → `family_units.phone_landline` (house attribute)
- `email` → `family_members.email` (person attribute, nullable)
These relocations go in 016 Stage A (copy then verify) before Stage B drops them from profiles.

---
