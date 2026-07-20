# St. George Marthoma Church — Community PWA

## ⚠️ TRIAL MODE — Launch-Day Revert Checklist

> Run `grep -rn "// TRIAL:"` to find every change that must be reverted before launch.

- [ ] `src/app/auth/login/page.tsx` — `shouldCreateUser: true → false`; restore "not registered" error block
- [ ] `src/app/(app)/layout.tsx:23` — restore `if (profile.status === 'pending') redirect('/auth/pending')`  and `if (profile.status !== 'active') redirect('/auth/disabled')`
- [ ] `src/app/(app)/page.tsx:19` — restore `if (!p || p.status === 'pending') redirect('/auth/pending')` + `if (p.status !== 'active') redirect('/auth/disabled')`
- [ ] `src/app/(app)/directory/FamilyDirectory.tsx` — remove `isAdmin &&` guard from phone block (~line 210) and address outer condition (~line 160)
- [ ] **Process trial signups:** `SELECT * FROM profiles WHERE claim_status = 'unclaimed'` — Secretary matches against physical register, links each to a `family_members` row, sets `status = 'active'`
- [ ] Run `supabase/seed_trial.sql` again if Bhagam group slugs were modified
- [ ] Confirm Supabase Dashboard → Authentication → Hooks → Send SMS hook is **removed** (not just disabled)

---

A Progressive Web App for St. George Marthoma Syrian Church, Alappuzha, Kerala.

## Tech Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Supabase** — Postgres, Auth (phone OTP), RLS, Realtime, Storage
- **Tailwind CSS** + shadcn/ui
- **next-intl** — English + Malayalam
- **next-pwa** — Service Worker, offline support
- **web-push** — VAPID Web Push notifications

## Build Stages

| # | Stage | Status |
|---|-------|--------|
| 1 | Scaffold + Supabase schema + RLS + RLS tests | ✅ Done |
| 2 | Auth flow (OTP, pending approval, sessions) | ✅ Done |
| 3 | Groups directory + public pages + calendar | ✅ Done (basic) |
| 4 | Admin dashboard | 🔲 Stage 4 |
| 5 | Leader dashboard + composer | 🔲 Stage 5 |
| 6 | Member feed (realtime) | 🔲 Stage 6 |
| 7 | i18n pass + Malayalam font | 🔲 Stage 7 |
| 8 | PWA + Push notifications + cron | 🔲 Stage 8 |
| 9 | Polish: empty states, skeletons, a11y | 🔲 Stage 9 |

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (see config below)
- Vercel account (for deployment)

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local

# Generate VAPID keys for Web Push
npx web-push generate-vapid-keys

# Run development server
npm run dev
```

### Environment Variables

See `.env.example` for all required variables.

**Required before running:**
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, never commit)

**Required before deploying:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` — generate with `npx web-push generate-vapid-keys`
- `CRON_SECRET` — protect the reminder cron route

### Database

Migrations are in `/supabase/migrations/`. Apply in order:

```
001_initial_schema.sql   — core tables
002_rls_policies.sql     — RLS helper functions + policies
003_auth_trigger.sql     — auto-creates profile on signup
004_storage_buckets.sql  — storage buckets + RLS
005_seed_data.sql        — dev seed (6 sample groups)
```

Apply via Supabase Dashboard → SQL Editor, or with the Supabase CLI:

```bash
npx supabase db push
```

### SMS OTP (2Factor.in)

The app uses Supabase's phone OTP. Once your DLT-approved header and template are ready, configure the Supabase Auth "Send SMS Hook" to call a Supabase Edge Function that forwards OTPs via 2Factor.in's API.

During development, use Supabase's test OTP feature (fixed OTP for whitelisted numbers — no SMS sent).

### Roles

- **admin** — the Vicar. Set `profiles.is_admin = true` via Supabase Dashboard.
- **leader** — set `group_memberships.role = 'leader'` for a specific group.
- **member** — default for all approved users.

## Project Structure

```
src/
  app/              Next.js App Router pages
    auth/           Login, pending, disabled screens
    groups/         Group directory + public pages + feeds
    calendar/       Combined parish calendar
    me/             Profile + settings
    admin/          Vicar dashboard
    manage/[slug]/  Group leader dashboard
  components/       Shared React components
  lib/
    supabase/       client.ts, server.ts, service.ts
    phone.ts        Phone number normalisation (+91)
    utils.ts        cn() helper
  messages/         en.json, ml.json (translations)
  types/
    database.ts     Supabase generated types
  i18n.ts           next-intl config
  middleware.ts     Auth routing

supabase/
  migrations/       SQL migration files
  tests/
    rls.test.ts     RLS security tests

tests/
  e2e/
    happy-path.spec.ts  Playwright E2E
```
