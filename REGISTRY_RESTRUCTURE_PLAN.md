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
- `phone`, `avatar_url`, `family_photo_url`
- `whatsapp_number`, `is_mobile_whatsapp`
- `ui_language`, notification prefs
- `status`, `is_admin` (deprecated flag — kept for backwards compat)
- `family_member_id` FK (the attachment point to the registry)
- `display_name` (derived cache from `family_members.full_name` — clearly marked)

**Remove from `profiles` (after backfill verified):**
- `full_name`, `full_name_ml`
- `house_name`, `address`, `date_of_birth`
- `phone_landline`, `email`
- `family_members` (jsonb) remnant

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
  add column if not exists display_name     text,
  add column if not exists claim_status     text not null default 'unclaimed'
                             check (claim_status in ('unclaimed','pending_claim','approved'));

create index if not exists idx_profiles_family_member
  on public.profiles (family_member_id) where family_member_id is not null;

-- 2. Head of family on family_units
alter table public.family_units
  add column if not exists head_member_id uuid references public.family_members on delete set null;

-- 3. life_event_types lookup table
create table if not exists public.life_event_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  name_ml    text,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.life_event_types (name, name_ml, sort_order) values
  ('Baptism',              'ജ്ഞാനസ്നാനം',       1),
  ('First Holy Communion', 'ആദ്യ ദിവ്യകാരുണ്യം', 2),
  ('Confirmation',         'ഉറഫ',               3),
  ('Marriage',             'വിവാഹം',             4),
  ('Marriage Dissolution', 'വിവാഹ മോചനം',       5),
  ('Remarriage',           'പുനർ വിവാഹം',       6),
  ('Death',                'മരണം',               7),
  ('Other',                'മറ്റുള്ളവ',          8)
on conflict do nothing;

-- 4. life_events: add FK to lookup + related-event chain
alter table public.life_events
  add column if not exists life_event_type_id uuid references public.life_event_types,
  add column if not exists related_event_id   uuid references public.life_events;

-- RLS
alter table public.life_event_types enable row level security;
create policy "life_event_types: read"
  on public.life_event_types for select to authenticated using (true);
create policy "life_event_types: super_admin write"
  on public.life_event_types for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
```

### Migration 016: Backfill + Slim Profiles (two-stage — verify between)

```sql
-- ══════════════════════════════════════════════════════════════════════
-- STAGE A: Backfill display_name + family_member_id (SAFE — run first)
-- ══════════════════════════════════════════════════════════════════════

-- Link profiles that already have a family_members row via profile_id
update public.profiles p
set    display_name     = fm.full_name,
       family_member_id = fm.id,
       claim_status     = 'approved'
from   public.family_members fm
where  fm.profile_id = p.id;

-- Cache display_name for profiles not yet linked
update public.profiles
set    display_name = full_name
where  display_name is null and full_name is not null;

-- ── VERIFY before Stage B ────────────────────────────────────────────
-- Run this check — result must be 0:
--   select count(*) from profiles
--   where status = 'active' and display_name is null;
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
--   drop column if exists phone_landline,
--   drop column if exists email,
--   drop column if exists family_members;   -- the JSONB remnant
```

---

## Files to Create / Modify

| File | Action | What changes |
|---|---|---|
| `supabase/migrations/015_registry_schema.sql` | **Create** | Schema additions (safe) |
| `supabase/migrations/016_profiles_slim.sql` | **Create** | Backfill + staged column drops |
| `supabase/migrations/003_auth_trigger.sql` | **Update** | Minimal profile creation (no name fields) |
| `src/app/auth/claim/page.tsx` | **Create** | Step 1: household search |
| `src/app/auth/claim/pick/page.tsx` | **Create** | Step 2: family member picker |
| `src/app/auth/claim/actions.ts` | **Create** | claimFamilyMember, approveClaim, denyClaim |
| `src/components/auth/HouseholdSearch.tsx` | **Create** | Searchable picker grouped by Bhagam |
| `src/components/auth/FamilyMemberPicker.tsx` | **Create** | Member rows; hides claimed ones |
| `src/app/auth/pending/page.tsx` | **Update** | Claim-status-aware bilingual messages |
| `src/app/auth/login/page.tsx` | **Update** | Redirect to /auth/claim after OTP |
| `src/app/(app)/me/page.tsx` | **Update** | Registry read; settings-only edit |
| `src/components/directory/ProfileCard.tsx` | **Update** | Reads registry join; correction button |
| `src/components/directory/MemberForm.tsx` | **Deprecate** | Replaced by ProfileSettings for /me; keep for admin use |
| `src/app/(app)/directory/page.tsx` | **Update** | View-only from directory_entries |
| `src/app/(app)/admin/page.tsx` | **Update** | Add Claims Queue section |
| `src/app/(app)/admin/wave2-actions.ts` | **Update** | Add approveClaim, denyClaim |
| `src/types/database.ts` | **Update** | New columns, life_event_types type |
| `APP_DEFINITION.md` | **Update** | Registration + Registry sections rewrite |
| `Alleppey_Marthoma_System_Definition.md` | **Update** | Slimmed profiles model; remove Unlinked Profiles Panel |
| `HOW_TO_USE.md` | **Update** | Section 1 (first login) + Section 5 (Registry) |

---

## Order of Operations (data safety)

```
Step 1 — Run migration 015 (safe — only adds, never drops)
Step 2 — Update all READ paths to use registry join
          (app still works via old columns during transition)
Step 3 — Run migration 016 Stage A (backfill display_name + family_member_id)
Step 4 — VERIFY: 0 active profiles with null display_name
Step 5 — Ship claim flow (/auth/claim + updated /me + Claims Queue in admin)
Step 6 — Test fully with live data; confirm all flows work
Step 7 — Run migration 016 Stage B (drop old columns)
Step 8 — Remove remaining code references to dropped columns
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

*This plan was prepared on 2026-07-17. No code changes have been made. Awaiting go-ahead to begin implementation.*
