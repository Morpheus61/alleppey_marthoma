# Alleppey Marthoma — System Definition
### St. George Marthoma Syrian Church Community PWA
**Last Updated:** 2026-07-14 | **Build Stage:** 1 of 9 Complete

---

## Table of Contents
1. [Project Identity](#1-project-identity)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Repository & Version Control](#4-repository--version-control)
5. [Environment & Credentials](#5-environment--credentials)
6. [Project File Structure](#6-project-file-structure)
7. [Next.js Configuration](#7-nextjs-configuration)
8. [Database Schema](#8-database-schema)
9. [Row Level Security (RLS)](#9-row-level-security-rls)
10. [Authentication System](#10-authentication-system)
11. [Application Routes](#11-application-routes)
12. [Supabase Clients](#12-supabase-clients)
13. [Internationalisation (i18n)](#13-internationalisation-i18n)
14. [Styling System](#14-styling-system)
15. [Storage Buckets](#15-storage-buckets)
16. [Role System](#16-role-system)
17. [PWA & Push Notifications](#17-pwa--push-notifications)
18. [Deployment Configuration](#18-deployment-configuration)
19. [Testing Infrastructure](#19-testing-infrastructure)
20. [Build Stage Status](#20-build-stage-status)
21. [Known Issues & Workarounds](#21-known-issues--workarounds)
22. [Pending Actions Required](#22-pending-actions-required)

---

## 1. Project Identity

| Field | Value |
|---|---|
| **App Name (English)** | St. George Marthoma Church |
| **App Short Name** | SGM Church |
| **App Name (Malayalam)** | സെന്റ് ജോർജ് മർത്തോമ്മ ചർച്ച് |
| **Parish** | Alappuzha (Alleppey), Kerala, India |
| **Denomination** | Marthoma Syrian Church of Malabar |
| **Primary Users** | Parish members, teenagers to senior citizens |
| **Primary Languages** | English (default), Malayalam |
| **npm package name** | `alleppey-marthoma` |
| **Version** | 0.1.0 |
| **PWA Theme Colour** | `#7f1d1d` (Deep Red — `brand-900`) |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Next.js 16 App Router (TypeScript)     │   │
│  │                                                  │   │
│  │  ┌─────────────┐  ┌───────────┐  ┌───────────┐  │   │
│  │  │ Server      │  │ Client    │  │ Route     │  │   │
│  │  │ Components  │  │ Components│  │ Handlers  │  │   │
│  │  │ (RSC)       │  │ ('use     │  │ /api/...  │  │   │
│  │  │             │  │  client') │  │           │  │   │
│  │  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘  │   │
│  │         │               │              │         │   │
│  └─────────┼───────────────┼──────────────┼─────────┘   │
│            │               │              │              │
│            └───────────────┼──────────────┘              │
│                            │                             │
│              ┌─────────────▼──────────────┐              │
│              │        Supabase            │              │
│              │  ┌──────┐ ┌─────────────┐ │              │
│              │  │ Auth │ │  Postgres   │ │              │
│              │  │ (OTP)│ │  + RLS      │ │              │
│              │  └──────┘ └─────────────┘ │              │
│              │  ┌──────┐ ┌─────────────┐ │              │
│              │  │Storage│ │  Realtime  │ │              │
│              │  └──────┘ └─────────────┘ │              │
│              └────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Key Principles:**
- No separate backend — all server logic via Next.js Route Handlers / Server Actions
- All authorization enforced by **Supabase RLS policies** — never UI-only
- Service-role key is **server-only** — never exposed to client bundles
- Mobile-first (360px minimum width), touch targets ≥ 44px

---

## 3. Technology Stack

### Runtime & Framework
| Package | Version | Purpose |
|---|---|---|
| `next` | `^16.2.10` | Framework (App Router, Turbopack) |
| `react` | `^18.3.1` | UI runtime |
| `react-dom` | `^18.3.1` | DOM renderer |
| `typescript` | `^5.7.2` | Type safety |
| Node.js | `v20.19.5` (dev) | Runtime — upgrade to 22 for production |

### Supabase
| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.47.3` (resolves 2.110.4) | DB + Auth client |
| `@supabase/ssr` | `^0.5.2` | Server-side session management |

> **Note:** `@supabase/supabase-js@2.110.4` requires Node.js ≥ 22. Works on Node 20 with deprecation warnings.

### Internationalisation
| Package | Version | Purpose |
|---|---|---|
| `next-intl` | `^3.26.3` (resolves 3.26.5) | English + Malayalam UI translations |

### UI & Styling
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | `^3.4.17` | Utility CSS framework |
| `tailwindcss-animate` | `^1.0.7` | Animation utilities |
| `tailwind-merge` | `^2.6.1` | Class name merging utility |
| `clsx` | `^2.1.1` | Conditional class names |
| `cmdk` | `^1.0.0` | Searchable combobox (member picker) |

### Data & Forms
| Package | Version | Purpose |
|---|---|---|
| `zod` | `^3.24.1` | Runtime schema validation |
| `date-fns` | `^4.1.0` | Date manipulation |
| `react-day-picker` | `^9.4.4` | Visual date picker (no typed dates) |
| `rrule` | `^2.8.1` | iCal recurrence rules (weekly events) |
| `xlsx` | `^0.18.5` | Excel/CSV parish directory import |
| `browser-image-compression` | `^2.0.2` | Client-side image compression (max ~300KB) |

### Drag & Drop
| Package | Version | Purpose |
|---|---|---|
| `@dnd-kit/core` | `^6.1.0` | DnD runtime |
| `@dnd-kit/sortable` | `^8.0.0` | Sortable lists |
| `@dnd-kit/utilities` | `^3.2.2` | DnD helpers |

### Push Notifications
| Package | Version | Purpose |
|---|---|---|
| `web-push` | `^3.6.7` | VAPID Web Push (server-side fanout) |

### Dev Tools
| Package | Version | Purpose |
|---|---|---|
| `@playwright/test` | `^1.49.1` | End-to-end tests |
| `eslint` | `^8.57.1` | Linting |
| `eslint-config-next` | `^16.2.10` | Next.js ESLint rules |
| `postcss` | `^8.4.49` | CSS processing |
| `autoprefixer` | `^10.4.20` | CSS vendor prefixes |

---

## 4. Repository & Version Control

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/Morpheus61/alleppey_marthoma |
| **Owner** | Morpheus61 |
| **Default Branch** | `main` |
| **Initial Commit** | `d43edc2` — "Stage 1: scaffold, schema, RLS, auth flow, stub pages" |
| **Files committed** | 51 files, 13,522 insertions |

### .gitignore — Excluded from repo
- `node_modules/`
- `.next/` (build output)
- `.env.local` and `.env.*.local` (**secrets never committed**)
- Service worker build artifacts (`sw.js`, `workbox-*.js`)
- Playwright test results

---

## 5. Environment & Credentials

### File: `.env.local` (never committed)

```bash
# ── PUBLIC (safe in client bundle) ─────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://nsuxmlbrehmqdwogkjwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  # (anon JWT — see actual file)

# ── SECRET (server-only, never expose to client) ───────────
SUPABASE_SERVICE_ROLE_KEY=                 # ⚠ FILL IN from Supabase Dashboard

# ── WEB PUSH VAPID ─────────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=             # generate: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=                        # server-only

# ── CRON PROTECTION ────────────────────────────────────────
CRON_SECRET=                              # generate: openssl rand -hex 32

# ── SMS OTP (2Factor.in) ───────────────────────────────────
TWOFACTOR_API_KEY=<rotated — see .env.local>              # ⚠ KEY ROTATED — original exposed in doc; rotate in 2Factor dashboard before next use
TWOFACTOR_TEMPLATE_NAME=                  # ⚠ Awaiting DLT approval
```

### Supabase Project
| Field | Value |
|---|---|
| **Project ID** | `nsuxmlbrehmqdwogkjwr` |
| **Project URL** | `https://nsuxmlbrehmqdwogkjwr.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/nsuxmlbrehmqdwogkjwr |
| **Region** | (Supabase default — check dashboard) |
| **Tier** | Free |

### Template: `.env.example` (committed — safe template)
Contains all variable names with placeholder values and generation instructions.

---

## 6. Project File Structure

```
Alleppey_Marthoma/
│
├── .env.example                    # Template — safe to commit
├── .env.local                      # Secrets — NEVER commit
├── .eslintrc.json                  # ESLint config
├── .gitignore
├── components.json                 # shadcn/ui config
├── next.config.js                  # Next.js + next-intl + turbopack alias
├── next-env.d.ts                   # Next.js TypeScript declarations
├── next-intl.config.ts             # (legacy — actual config in src/i18n/)
├── package.json
├── package-lock.json
├── playwright.config.ts            # E2E test config
├── postcss.config.js
├── tailwind.config.ts              # Brand colours + CSS variable mappings
├── tsconfig.json                   # TypeScript config (strict mode)
├── vercel.json                     # Vercel deployment + cron config
│
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── MarThoma_logo.png           # Brand logo
│   ├── brand/                      # (reserved for maskable icons)
│   └── icons/                      # (reserved — PWA icons Stage 8)
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       └── icon-maskable-512x512.png
│
├── src/
│   ├── i18n.ts                     # Re-export → src/i18n/request.ts
│   ├── proxy.ts                    # Auth routing (Next.js 16 "proxy" convention)
│   │
│   ├── app/                        # Next.js App Router
│   │   ├── globals.css             # Tailwind base + CSS variable definitions
│   │   ├── layout.tsx              # Root layout (Google Fonts link, next-intl)
│   │   ├── page.tsx                # Home — redirects to login or dashboard
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx      # Phone OTP login (2-step: number → OTP)
│   │   │   ├── pending/page.tsx    # Awaiting approval screen
│   │   │   └── disabled/page.tsx   # Disabled account screen
│   │   │
│   │   ├── groups/
│   │   │   ├── page.tsx            # All groups directory (cards)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # Public group landing page
│   │   │       └── feed/page.tsx   # Member-only feed (gated)
│   │   │
│   │   ├── calendar/page.tsx       # Combined parish calendar (public events)
│   │   ├── me/page.tsx             # Profile + my groups + settings
│   │   ├── admin/page.tsx          # Vicar dashboard (admin only)
│   │   └── manage/[slug]/page.tsx  # Leader dashboard (per group)
│   │
│   │   └── api/
│   │       └── cron/
│   │           └── reminders/route.ts  # Vercel Cron — push reminder fanout (Stage 8)
│   │
│   ├── components/
│   │   └── auth/
│   │       └── SignOutButton.tsx    # Client component for sign-out
│   │
│   ├── i18n/
│   │   └── request.ts              # next-intl getRequestConfig (locale from cookie)
│   │
│   ├── lib/
│   │   ├── phone.ts                # normalizePhone() — +91 normalisation
│   │   ├── utils.ts                # cn() — Tailwind class merge helper
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase client
│   │       ├── server.ts           # Server Supabase client (async cookies)
│   │       └── service.ts          # Service-role client (server-only)
│   │
│   ├── messages/
│   │   ├── en.json                 # English UI strings (full)
│   │   └── ml.json                 # Malayalam UI strings (full)
│   │
│   └── types/
│       └── database.ts             # Hand-written Supabase types (all 8 tables)
│
├── supabase/
│   ├── config.json                 # Supabase project config
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Core tables + indexes + triggers
│   │   ├── 002_rls_policies.sql    # RLS enable + helper functions + all policies
│   │   ├── 003_auth_trigger.sql    # Auto-create profile on signup
│   │   ├── 004_storage_buckets.sql # Storage buckets + RLS
│   │   └── 005_seed_data.sql       # Dev seed — 6 sample groups
│   └── tests/
│       └── rls.test.ts             # RLS security tests
│
└── tests/
    └── e2e/
        └── happy-path.spec.ts      # Playwright: admin → member → post → RSVP
```

---

## 7. Next.js Configuration

**File:** `next.config.js`

```javascript
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts')

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'nsuxmlbrehmqdwogkjwr.supabase.co',
      pathname: '/storage/v1/object/public/**',
    }],
  },
}

const withIntlConfig = withNextIntl(nextConfig)

// CRITICAL WORKAROUND: next-intl v3.26 writes alias to experimental.turbo
// but Next.js 16 reads it from top-level turbopack. Must override manually.
module.exports = {
  ...withIntlConfig,
  turbopack: {
    resolveAlias: {
      'next-intl/config': './src/i18n/request.ts',
    },
  },
}
```

**`tsconfig.json` key settings:**
- `"strict": true` — TypeScript strict mode
- `"moduleResolution": "bundler"` — Turbopack-compatible
- `"paths": { "@/*": ["./src/*"] }` — absolute imports
- `"types": ["node"]` — prevents `@types/minimatch` stub from breaking the build
- `"jsx": "react-jsx"` — Next.js automatic JSX runtime

---

## 8. Database Schema

Applied via Supabase migrations (`/supabase/migrations/`). **Apply in order 001 → 005 via Supabase SQL Editor.**

### Table: `profiles` (extends `auth.users`)
```sql
id            uuid PRIMARY KEY  references auth.users ON DELETE CASCADE
full_name     text NOT NULL
full_name_ml  text                             -- optional Malayalam name
phone         text UNIQUE NOT NULL             -- normalised E.164 (+91XXXXXXXXXX)
house_name    text                             -- local identifier
avatar_url    text
ui_language   text DEFAULT 'en'  CHECK (ui_language IN ('en','ml'))
is_admin      boolean DEFAULT false NOT NULL
status        text DEFAULT 'pending'  CHECK (status IN ('pending','active','disabled'))
created_at    timestamptz DEFAULT now() NOT NULL
```

### Table: `groups`
```sql
id              uuid PRIMARY KEY  DEFAULT gen_random_uuid()
slug            text UNIQUE NOT NULL             -- URL slug e.g. 'sevika-sangam'
name            text NOT NULL                    -- English name
name_ml         text                             -- Malayalam name
description     text                             -- public page content (markdown)
description_ml  text
cover_image_url text
group_type      text DEFAULT 'functional'  CHECK (group_type IN ('functional','prayer','youth'))
is_archived     boolean DEFAULT false NOT NULL
created_at      timestamptz DEFAULT now() NOT NULL
```

### Table: `group_memberships`
```sql
group_id   uuid  references groups ON DELETE CASCADE
user_id    uuid  references profiles ON DELETE CASCADE
role       text DEFAULT 'member'  CHECK (role IN ('member','leader'))
status     text DEFAULT 'active'  CHECK (status IN ('requested','active','removed'))
joined_at  timestamptz DEFAULT now() NOT NULL
PRIMARY KEY (group_id, user_id)
```

### Table: `posts`
```sql
id          uuid PRIMARY KEY  DEFAULT gen_random_uuid()
group_id    uuid  references groups ON DELETE CASCADE   -- NULL = parish-wide
author_id   uuid  references profiles NOT NULL
title       text
body        text NOT NULL                               -- Malayalam, English, or mixed
visibility  text DEFAULT 'members'  CHECK (visibility IN ('members','public'))
image_urls  text[] DEFAULT '{}'
is_pinned   boolean DEFAULT false NOT NULL
is_deleted  boolean DEFAULT false NOT NULL              -- soft-delete (undo support)
deleted_at  timestamptz
created_at  timestamptz DEFAULT now() NOT NULL
updated_at  timestamptz DEFAULT now() NOT NULL          -- auto-updated via trigger
```

### Table: `comments`
```sql
id          uuid PRIMARY KEY  DEFAULT gen_random_uuid()
post_id     uuid  references posts ON DELETE CASCADE NOT NULL
author_id   uuid  references profiles NOT NULL
body        text NOT NULL
created_at  timestamptz DEFAULT now() NOT NULL
```

### Table: `events`
```sql
id                uuid PRIMARY KEY  DEFAULT gen_random_uuid()
group_id          uuid  references groups ON DELETE CASCADE   -- NULL = parish-wide
created_by        uuid  references profiles NOT NULL
title             text NOT NULL
title_ml          text
description       text
venue             text
starts_at         timestamptz NOT NULL
ends_at           timestamptz
visibility        text DEFAULT 'public'  CHECK (visibility IN ('members','public'))
rrule             text                                        -- iCal RRULE string
reminder_minutes  int DEFAULT 1440                           -- push lead time (minutes)
created_at        timestamptz DEFAULT now() NOT NULL
```

### Table: `event_rsvps`
```sql
event_id      uuid  references events ON DELETE CASCADE
user_id       uuid  references profiles ON DELETE CASCADE
response      text NOT NULL  CHECK (response IN ('yes','no','maybe'))
responded_at  timestamptz DEFAULT now() NOT NULL
PRIMARY KEY (event_id, user_id)
```

### Table: `push_subscriptions`
```sql
id            uuid PRIMARY KEY  DEFAULT gen_random_uuid()
user_id       uuid  references profiles ON DELETE CASCADE NOT NULL
subscription  jsonb NOT NULL                              -- PushSubscription JSON
created_at    timestamptz DEFAULT now() NOT NULL
```

### Indexes
| Index | Table | Columns |
|---|---|---|
| `idx_posts_group_id` | posts | group_id |
| `idx_posts_author_id` | posts | author_id |
| `idx_posts_created_at` | posts | created_at DESC |
| `idx_comments_post_id` | comments | post_id |
| `idx_events_group_id` | events | group_id |
| `idx_events_starts_at` | events | starts_at |
| `idx_memberships_user` | group_memberships | user_id |
| `idx_push_user_id` | push_subscriptions | user_id |
| `idx_profiles_phone` | profiles | phone |
| `idx_profiles_status` | profiles | status |

### Triggers
- `posts_updated_at` — `BEFORE UPDATE` on `posts`, calls `set_updated_at()` to auto-set `updated_at = now()`

---

## 9. Row Level Security (RLS)

**RLS is enabled on all 8 tables.** All authorization is enforced at the database level.

### Helper Functions (`SECURITY DEFINER`)

```sql
-- Returns true if calling user is admin with active status
public.is_admin() → boolean

-- Returns true if calling user has active membership in the group
public.is_group_member(p_group_id uuid) → boolean

-- Returns true if calling user is active leader of the group
public.is_group_leader(p_group_id uuid) → boolean
```

### Policy Summary

| Table | Who Can Read | Who Can Write |
|---|---|---|
| `profiles` | Authenticated (active profiles + own row) | Own row (except `is_admin`, `status`); admin updates any |
| `groups` | Authenticated (non-archived) | Admin: full; Leader: only `description`, `description_ml`, `cover_image_url` |
| `group_memberships` | Members of same group; leaders see all in their group | Self-insert as `requested`; leader/admin approve; **role=leader: admin only** |
| `posts` | Public visibility: all auth; Member visibility: group members only | Leader: own group; Admin: any group + parish-wide |
| `comments` | Same rules as parent post | Any member who can read post; own delete; leader/admin delete in scope |
| `events` | Public: all auth; Members: group members | Leader: own group; Admin: any |
| `event_rsvps` | Same as parent event | Own row only (insert/update/delete) |
| `push_subscriptions` | Own rows only | Own rows only; service_role reads all (for fanout) |

### Auth Trigger (`migration 003`)
```sql
-- Fires AFTER INSERT on auth.users
-- Creates profiles row automatically on signup
-- Handles bulk pre-registration: if phone matches a pre-registered row, 
-- links auth user and sets status='active' (pre-approved)
public.handle_new_user() RETURNS trigger
```

---

## 10. Authentication System

### Flow
1. User enters mobile number → normalised to E.164 (`+91XXXXXXXXXX`)
2. Supabase sends 6-digit OTP via SMS
3. User enters OTP → Supabase verifies → session created
4. Auth trigger creates `profiles` row with `status='pending'`
5. Admin approves → `status='active'` → full access

### Phone Normalisation (`src/lib/phone.ts`)
Accepts: `9876543210`, `+919876543210`, `91 9876543210`, `98765-43210`, etc.
- Strips all non-digits
- Handles 91-prefixed 12-digit and bare 10-digit numbers
- Validates Indian mobile (starts with 6–9, 10 digits)
- Returns `+91XXXXXXXXXX` or `null` if invalid

### Status States
| Status | Meaning | Access |
|---|---|---|
| `pending` | Registered, awaiting approval | Sees "Awaiting approval" screen only |
| `active` | Approved by admin | Full access based on group memberships |
| `disabled` | Banned/removed by admin | Sees "Account disabled" screen only |

### Pending Approval Screen (`/auth/pending`)
- Shown immediately after first OTP login
- Bilingual: English + Malayalam message
- Contact info for church office
- Sign-out button

### Admin Pre-Registration (Bulk Import)
- Admin uploads Excel/CSV with parish directory
- Creates `profiles` rows with `status='pending'` (no `id`)
- On first OTP login, trigger matches phone, links `auth.users.id`, sets `status='active'`

### SMS Provider
- **Dev/Testing:** Supabase test OTP (fixed code for whitelisted numbers, no SMS)
- **Production:** 2Factor.in via Supabase Auth "Send SMS Hook"
  - API Key: ✅ Set (`TWOFACTOR_API_KEY`)
  - DLT Template: ⚠️ Awaiting approval (see Section 22)

### Session Management
- Supabase default refresh tokens (long-lived)
- Users essentially never need to re-login
- Cookie-based sessions via `@supabase/ssr`

### Route Protection (`src/proxy.ts`)
Next.js 16 `proxy` function (replaces `middleware.ts`):
- Unauthenticated → redirects to `/auth/login`
- Authenticated on `/auth/login` → redirects to `/`
- Public paths exempt: `/auth/login`, `/auth/pending`, `/auth/disabled`, `/groups`
- Uses `getAll`/`setAll` cookie pattern for `@supabase/ssr` v0.5+

---

## 11. Application Routes

All routes confirmed built and compiled clean as of Stage 1.

| Route | Type | Auth Required | Description |
|---|---|---|---|
| `/` | Server (Dynamic) | Active member | Home: announcements + calendar stub |
| `/auth/login` | Client Component | No | Phone OTP login form |
| `/auth/pending` | Server | Pending user | Awaiting approval screen |
| `/auth/disabled` | Server | Disabled user | Account disabled screen |
| `/groups` | Server | Authenticated | Groups directory (members-only; non-members redirected to login) |
| `/groups/[slug]` | Server | Authenticated | Group page (members-only; description, leaders, events) |
| `/groups/[slug]/feed` | Server | Active member | Member-only post feed |
| `/groups/[slug]/calendar` | — | — | *(Stage 3 — not yet built)* |
| `/calendar` | Server | Authenticated | Combined parish calendar (public events) |
| `/me` | Server | Active member | Profile, groups, settings |
| `/admin` | Server | `is_admin=true` | Vicar dashboard |
| `/manage/[slug]` | Server | Leader or admin | Group leader dashboard |
| `/api/cron/reminders` | Route Handler | `CRON_SECRET` header | Push reminder fanout (Stage 8) |

### Proxy (Middleware) Config
```
Matches: all paths EXCEPT:
  _next/static, _next/image, favicon.ico, icons/,
  fonts/, manifest.json, sw.js, workbox-*, api/cron
```

> **Routing decision (2026-07-15):** `/groups` and `/groups/[slug]` are **members-only**. They have been removed from the middleware's `PUBLIC_PATHS` list. Unauthenticated visitors are redirected to `/auth/login`. Opening them to public outreach in a future stage is easy; walking back a broken promise to the parish is not. If public outreach is desired later, add an anon-read RLS policy on `groups` and public `posts`/`events` at the same time.

---

## 12. Supabase Clients

Three separate clients for different contexts:

### `src/lib/supabase/client.ts` — Browser
```typescript
// Used in 'use client' components
import { createBrowserClient } from '@supabase/ssr'
export function createClient() { ... }
```

### `src/lib/supabase/server.ts` — Server Components / Route Handlers
```typescript
// Async — must be called with: const supabase = await createClient()
import { createServerClient } from '@supabase/ssr'
export async function createClient() {
  const cookieStore = await cookies()  // Next.js 15+ async cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { ... }  // getAll/setAll pattern (ssr v0.5+)
    }
  })
}
```

### `src/lib/supabase/service.ts` — Privileged Server Operations
```typescript
// NEVER import in client components
// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
export function createServiceClient() { ... }
```

> **TypeScript note:** The `Database` generic is NOT passed to `createServerClient` because `@supabase/supabase-js@2.110.4` requires CLI-generated types. Manual type assertions (`as Profile | null`) are used per-query until `npx supabase gen types typescript` is run.

---

## 13. Internationalisation (i18n)

### Setup
- **Library:** `next-intl` v3.26.5
- **Config file:** `src/i18n/request.ts` (v3.22+ default path)
- **Plugin:** `require('next-intl/plugin')('./src/i18n/request.ts')`
- **Locale source:** Cookie `ui_language` (`'en'` | `'ml'`), falls back to `'en'`
- **Message files:** `src/messages/en.json`, `src/messages/ml.json`

### Locale Request Config (`src/i18n/request.ts`)
```typescript
export default getRequestConfig(async () => {
  let locale: 'en' | 'ml' = 'en'
  try {
    const cookieStore = await cookies()
    if (cookieStore.get('ui_language')?.value === 'ml') locale = 'ml'
  } catch { /* static generation — use default */ }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

### Translation Namespaces
| Namespace | Purpose |
|---|---|
| `home` | Home page strings |
| `auth` | Login, OTP, pending, disabled screens |
| `nav` | Navigation items |
| `groups` | Group directory, membership |
| `feed` | Post feed, comments |
| `composer` | Post composer + preview |
| `events` | Calendar, RSVP |
| `admin` | Vicar dashboard strings |
| `manage` | Leader dashboard strings |
| `profile` | Profile page strings |
| `common` | Shared: loading, error, offline, PWA install |

### Font Strategy
- **Build time:** Google Fonts CDN `<link>` in `layout.tsx` `<head>` (no `next/font/google` — unreachable from build machine)
- **Fonts loaded:** `Inter` (Latin), `Noto Sans Malayalam` (400, 500, 600, 700)
- **CSS variables:** `--font-inter`, `--font-noto-malayalam`
- **Malayalam class:** `font-malayalam` or `lang="ml"` attribute
- **Fallback stack:** system-ui, sans-serif

> **Stage 7:** Replace with `next/font/local` + bundled WOFF2 files in `/public/fonts/` for guaranteed conjunct rendering on old Android devices.

---

## 14. Styling System

### Tailwind Configuration (`tailwind.config.ts`)

**Content scan paths:**
```
src/pages/**/*.{js,ts,jsx,tsx,mdx}
src/components/**/*.{js,ts,jsx,tsx,mdx}
src/app/**/*.{js,ts,jsx,tsx,mdx}
```

**Brand Colour Palette** (`brand-*`):
| Token | Hex | Usage |
|---|---|---|
| `brand-50` | `#fef2f2` | Hover backgrounds |
| `brand-100` | `#fee2e2` | Light tints |
| `brand-900` | `#7f1d1d` | **Primary — headings, CTA buttons, PWA theme** |
| `brand-950` | `#450a0a` | Darkest shade |

**shadcn/ui CSS Variable Colours** (mapped in Tailwind config):
| Token | CSS Variable | Light Mode |
|---|---|---|
| `background` | `--background` | White |
| `foreground` | `--foreground` | Near-black |
| `primary` | `--primary` | `brand-900` (#7f1d1d) |
| `muted` | `--muted` | Light grey |
| `destructive` | `--destructive` | Red |
| `card` | `--card` | White |
| `border` | `--border` | Light grey |

**CSS Variables** defined in `globals.css` `:root` block for both light and dark modes.

**Custom extensions:**
```
fontFamily: { sans: var(--font-inter), malayalam: var(--font-noto-malayalam) }
minHeight/minWidth: { touch: 44px }  ← accessibility touch target
borderRadius: { DEFAULT: 0.5rem }
```

### Component Library
- **shadcn/ui** — configured via `components.json`
  - Style: `default`
  - RSC: `true`
  - Base colour: `slate`
  - CSS variables: `true`
- Component aliases: `@/components`, `@/lib/utils`

---

## 15. Storage Buckets

| Bucket | Public | Max Size | MIME Types | Used For |
|---|---|---|---|---|
| `post-images` | ❌ Private | 5 MB | jpeg, png, webp, gif | Post photo attachments |
| `group-covers` | ✅ Public | 5 MB | jpeg, png, webp | Group page cover images |
| `avatars` | ✅ Public | 2 MB | jpeg, png, webp | User profile photos |

**Client-side compression:** images are compressed to max ~1600px / ~300KB using `browser-image-compression` before upload.

**Naming convention for avatars:** `{user_id}/{filename}` (enforced by RLS — users can only upload to their own folder).

---

## 16. Role System

Three hierarchical roles:

### `admin` (Vicar / Parish Office)
- **Stored:** `profiles.is_admin = true`
- **Scope:** Entire parish
- **Capabilities:**
  - Create / archive groups
  - Appoint / revoke group leaders (`group_memberships.role = 'leader'`)
  - Approve / decline / disable member registrations
  - Post parish-wide announcements (`posts.group_id = NULL`)
  - Create parish-wide events
  - Access all group feeds and dashboards
  - Bulk import parish directory (Excel/CSV)

### `leader` (Group Manager)
- **Stored:** `group_memberships.role = 'leader'`
- **Scope:** Specific group(s) — a user may lead multiple groups
- **Capabilities:**
  - Post in their group's feed
  - Create / edit group events
  - Approve / remove group members
  - Edit group public page (`description`, `cover_image_url`)
  - View join requests
  - Cannot elevate members to leader (admin-only)

### `member` (Default)
- **Stored:** `group_memberships.role = 'member'`, `status = 'active'`
- **Scope:** Groups they belong to
- **Capabilities:**
  - Read public pages and own group feeds
  - Comment, react, RSVP on events
  - Request to join groups
  - Update own profile

---

## 17. PWA & Push Notifications

### PWA Manifest (`public/manifest.json`)
```json
{
  "name": "St. George Marthoma Church",
  "short_name": "SGM Church",
  "display": "standalone",
  "theme_color": "#7f1d1d",
  "background_color": "#ffffff",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192x192.png",         "sizes": "192x192" },
    { "src": "/icons/icon-512x512.png",          "sizes": "512x512" },
    { "src": "/icons/icon-maskable-512x512.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

> ⚠️ **Icons not yet generated** — placeholder filenames only. Stage 8 task.

### Service Worker
- **Stage 8 implementation** — will use `@serwist/next` (next-pwa v5 incompatible with Next.js 16)
- **Offline caching strategy:** App shell + last-fetched calendar + feeds (stale-while-revalidate)
- **Supabase cache:** `NetworkFirst`, 50 entries, 300s expiry

### Web Push (VAPID)
- **Library:** `web-push` (server-side)
- **Keys:** Generate with `npx web-push generate-vapid-keys` → store in `.env.local`
- **Subscription storage:** `push_subscriptions` table
- **Prompt timing:** After first meaningful user action (NOT on page load)

### Notification Triggers (Stage 8)
| Event | Recipients |
|---|---|
| New post in group | All active group members |
| Parish-wide post | All active members |
| Event reminder | Members subscribed to that event's group (fired `reminder_minutes` before start) |

### Vercel Cron (Event Reminders)
```json
{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }
```
Route protected by `Authorization: Bearer {CRON_SECRET}` header.

### iOS Install Flow
- iOS 16.4+ required for Web Push
- PWA must be added to Home Screen first
- Prompted with platform-specific illustrated steps (Safari Share → Add to Home Screen)

---

## 18. Deployment Configuration

### Vercel (`vercel.json`)
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

> **No `crons` key.** Vercel Hobby limits cron schedules to once per day; `*/15 * * * *` would fail deployment. Scheduling has been moved to **Supabase pg_cron** (see migration 006 below).

### Reminder Cron — Supabase pg_cron (migration 006)
Migration `006_pg_cron_reminders.sql` enables `pg_cron` and `pg_net` and schedules a job named `event-reminders` that fires `*/15 * * * *`. It uses `net.http_post()` to call `/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`. The Next.js route handles both GET and POST.

**Migration contains placeholders** (`__APP_URL__`, `__CRON_SECRET__`) — **run it manually in the Supabase SQL Editor with real values substituted. Do not commit real values.**

Once the parish custom domain is live, re-run the schedule with the new URL.

**Monitor runs:**
- Supabase Dashboard → Integrations → Cron
- Or: `select * from cron.job_run_details order by start_time desc limit 20;`

### Required Vercel Environment Variables
Set in Vercel Dashboard → Project → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL          ✅ (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY     ✅ (public)
SUPABASE_SERVICE_ROLE_KEY         ⚠ Set in Vercel (not in repo)
NEXT_PUBLIC_VAPID_PUBLIC_KEY      ⚠ Generate + set
VAPID_PRIVATE_KEY                 ⚠ Generate + set
CRON_SECRET                       ⚠ Generate + set
TWOFACTOR_API_KEY                 ✅ (set in .env.local — add to Vercel)
TWOFACTOR_TEMPLATE_NAME           ⚠ Awaiting DLT approval
```

---

## 19. Testing Infrastructure

### RLS Security Tests (`supabase/tests/rls.test.ts`)
Run with `npm run test:rls`.

Tests proven by the policies:
1. ✅ **Choir member CANNOT read Sevika Sangam member-only posts**
2. ✅ **Choir leader CANNOT insert post into Sevika Sangam**
3. ✅ **Member CANNOT change own `is_admin` or `status`** (enforced by `WITH CHECK`)
4. ✅ **Leader CANNOT promote member to leader** (admin-only `WITH CHECK`)

Uses Supabase Admin API to create test users, enroll in groups, verify isolation, then clean up.

### E2E Tests (`tests/e2e/happy-path.spec.ts`)
Playwright — happy-path smoke test:
```
admin approves member → assigns to group → leader posts → member sees post & RSVPs
```
Config: `playwright.config.ts` — Chromium + Mobile Chrome (Pixel 5)

### npm Scripts
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (no emit, type check only)
npm run test:rls     # Run RLS security tests
npx playwright test  # Run E2E tests
```

---

## 20. Build Stage Status

| # | Stage | Status | Notes |
|---|---|---|---|
| **1** | Scaffold + Supabase schema + RLS + RLS tests | ✅ **Complete** | Build clean, committed to GitHub |
| **2** | Auth flow (OTP, pending approval, sessions) | ✅ **Complete** | Included in Stage 1 commit |
| **3** | Groups directory + public pages + calendar | ✅ **Stub complete** | Basic read-only pages built; full layout Stage 3 |
| **4** | Admin dashboard | 🔲 Not started | Member approval, group creation, leader appoint, DnD member assignment |
| **5** | Leader dashboard + post composer | 🔲 Not started | Preview-before-post, event creation, recurrence |
| **6** | Member feed (realtime) | 🔲 Not started | Posts, comments, RSVPs, Supabase Realtime |
| **7** | i18n pass + local font bundling | 🔲 Not started | Full ml.json review, local WOFF2 fonts, language toggle |
| **8** | PWA + Push notifications + cron | 🔲 Not started | @serwist/next, VAPID, subscription fanout, iOS install flow |
| **9** | Polish — empty states, skeletons, a11y | 🔲 Not started | Lighthouse PWA ≥ 90, a11y audit |

---

## 21. Known Issues & Workarounds

### ① `experimental.turbo` Warning (harmless)
**Cause:** `next-intl/plugin` writes `experimental.turbo.resolveAlias` but Next.js 16 reads Turbopack config from top-level `turbopack`.  
**Workaround:** Top-level `turbopack.resolveAlias` manually added to `next.config.js` after `withNextIntl()`. Both keys exist — the warning is cosmetic only.

### ② `Node.js 20 deprecated` Runtime Warning
**Cause:** `@supabase/supabase-js@2.110.4` requires Node.js ≥ 22.  
**Impact:** None at runtime — works on Node 20.  
**Fix:** Upgrade to Node.js 22 LTS when deploying to Vercel (set Node version in Vercel project settings).

### ③ `multiple lockfiles` Warning
**Cause:** `C:\Users\user\package-lock.json` exists at the user home level.  
**Impact:** None.  
**Fix:** Delete `C:\Users\user\package-lock.json` if not needed.

### ④ Supabase TypeScript Generics
**Cause:** `@supabase/supabase-js@2.110.4` type inference requires CLI-generated types; hand-written `Database` interface causes `never` types.  
**Workaround:** `Database` generic removed from `createServerClient`. Manual `as Profile | null` casts used in every server page.  
**Fix (Stage 4):** Run `npx supabase gen types typescript --project-id nsuxmlbrehmqdwogkjwr > src/types/database.ts` to regenerate proper types.

### ⑤ Google Fonts Unreachable at Build Time
**Cause:** Build machine cannot reach `fonts.googleapis.com`.  
**Workaround:** Switched from `next/font/google` to HTML `<link>` tag in `layout.tsx`. Fonts load at runtime from CDN.  
**Fix (Stage 7):** Download WOFF2 files and use `next/font/local` with files in `/public/fonts/`.

### ⑥ `@types/minimatch` Stub
**Cause:** `@types/minimatch@6.0.0` is a stub that points to `minimatch`'s own types, but `minimatch@3.1.5` (installed) has no bundled types.  
**Workaround:** Added `"types": ["node"]` to `tsconfig.json` to prevent auto-inclusion of the broken stub.

---

## 22. Pending Actions Required

| Priority | Action | Owner | Notes |
|---|---|---|---|
| 🔴 **Critical** | **Rotate 2Factor API key** — original was printed in this doc and is burned | Dev | Log in to app.2factor.in, revoke old key, generate new one, update `.env.local` and Vercel |
| 🔴 **Critical** | Run migrations 001–005 in Supabase SQL Editor | Dev | Required before any testing |
| 🔴 **Critical** | Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` | Dev | Required for admin operations |
| 🔴 **Critical** | DLT header + template registration (India) | Church/Dev | Vilpower registration, ~5 working days |
| 🔴 **Critical** | Consider making GitHub repo **private** | Dev | Public repo + documented credentials = exposure risk; Vercel Hobby deploys private repos fine |
| 🟡 **High** | Regenerate Supabase TypeScript types | Dev | First command of Stage 4: `npx supabase gen types typescript --project-id nsuxmlbrehmqdwogkjwr > src/types/database.ts` |
| 🟡 **High** | Add `push_subscriptions` unique constraint | Dev/Stage 8 | Prevents double-notifications on re-subscribe: `UNIQUE (user_id, (subscription->>'endpoint'))` — add as migration 006 |
| 🟡 **High** | Add soft-delete to `events` table | Dev/Stage 5 | Add `is_deleted boolean DEFAULT false NOT NULL` + `deleted_at timestamptz` — same undo-toast requirement as posts; add as migration 006 |
| 🟡 **High** | Set `TWOFACTOR_TEMPLATE_NAME` once DLT approved | Dev | Unblock production SMS OTP |
| 🟡 **High** | Generate VAPID keys, set in `.env.local` | Dev | ✅ Done — keys generated 2026-07-14 |
| 🟡 **High** | Generate `CRON_SECRET`, set in `.env.local` | Dev | ✅ Done — generated 2026-07-14 |
| 🟡 **High** | Upload PWA icons to `/public/icons/` | Dev | Drop in icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png, apple-touch-icon.png (180×180) |
| 🟢 **Medium** | Enable Supabase Realtime publication (Stage 6) | Dev | Dashboard → Database → Replication → enable `posts` and `comments` tables before Stage 6 realtime work |
| 🟢 **Medium** | Handle `post-images` signed URLs (Stage 6) | Dev | `post-images` is a **private** bucket — feeds must call `supabase.storage.from('post-images').createSignedUrl()`, never public URLs |
| � **Critical** | Run migration 006 manually in Supabase SQL Editor | Dev | Substitute `__APP_URL__` (your `.vercel.app` URL) and `__CRON_SECRET__` before running. Re-run with parish domain once it is live. Never commit real values. |
| �🟢 **Medium** | Recurring events + cron (Stage 8) | Dev | The reminder cron scans `starts_at` only. A weekly event has one static `starts_at` + an `rrule`. Stage 8 must expand upcoming occurrences via the `rrule` lib before scanning, or recurring-event reminders fire once and stop |
| 🟢 **Medium** | Set Vercel environment variables | Dev | Before first Vercel deploy |
| 🟢 **Medium** | Upgrade Node.js to 22 LTS in Vercel settings | Dev | Suppress Supabase deprecation warning |
| 🟢 **Medium** | Download + bundle Noto Sans Malayalam WOFF2 | Dev/Stage 7 | Replace CDN `<link>` with `next/font/local` |
| 🟢 **Low** | Delete `C:\Users\user\package-lock.json` | Dev | Removes workspace root warning |

---

## 23. Seed Data (Development)

6 sample groups created by `005_seed_data.sql`:

| Slug | English Name | Malayalam Name | Type |
|---|---|---|---|
| `sevika-sangam` | Sevika Sangam | സേവിക സംഘം | functional |
| `choir` | Church Choir | ഗായകസംഘം | functional |
| `pain-palliative` | Pain & Palliative Care | ശൂശ്രൂഷ | functional |
| `yuvajana-sakhyam` | Yuvajana Sakhyam | യുവജന സഖ്യം | youth |
| `prayer-group-north` | North Ward Prayer Group | വടക്ക് വാർഡ് പ്രാർഥന ഗ്രൂപ്പ് | prayer |
| `prayer-group-south` | South Ward Prayer Group | തെക്ക് വാർഡ് പ്രാർഥന ഗ്രൂപ്പ് | prayer |

To create the admin user: set `profiles.is_admin = true` via Supabase Dashboard for the Vicar's account after first login.

---

*This document reflects the codebase state as of the Stage 1 commit (`d43edc2`) on 2026-07-14.*
*Update this file at the completion of each build stage.*
