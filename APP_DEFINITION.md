# St. George Marthoma Church — Community App

**App Name:** St. George Marthoma Church (SGM Church)  
**Parish:** Alappuzha (Alleppey), Kerala, India  
**Denomination:** Marthoma Syrian Church of Malabar  
**Languages:** English & Malayalam  
**Platform:** Progressive Web App (PWA) — works on any phone, tablet or desktop browser; installs to the home screen like a native app  

---

## What Is This App?

This is the official digital community platform for St. George Marthoma Syrian Church, Alappuzha. It connects every member of the parish — from teenagers to senior citizens — with their church, their groups, and each other.

The app replaces paper directories, WhatsApp broadcast chaos, and phone-call chains with a single organised digital space.

---

## Who Uses It?

| Role | Who They Are |
|---|---|
| **Parish Members** | All baptised members and family households |
| **Group Leaders** | Prayer group leaders, youth coordinators, committee heads |
| **Admin (Vicar / Office)** | Church Vicar, Secretary, or designated office staff |

---

## What Can the App Do?

### For Every Member
- **Register & Sign In** — using your Indian mobile number (OTP-based, no password needed)
- **My Profile** — save your full name (English & Malayalam), house name, address, date of birth, phone numbers, email, and family members
- **Profile Photo** — upload your own profile picture (round avatar)
- **Family Photo** — upload a household family photo (shown in the Parish Directory)
- **Parish Directory** — browse and search all active parish members with photos
- **Parish Calendar** — view upcoming services, events, and programmes
- **Groups** — see all parish groups (prayer groups, youth fellowship, committees, etc.)
- **Group Feed** — read bilingual (English & Malayalam) announcements from your groups
- **Push Notifications** — get reminders for upcoming events on your phone

### For Group Leaders (in addition to the above)
- **Post Bilingual Announcements** — publish English + Malayalam messages to your group's feed (members-only or public)
- **Pin Important Messages** — pin urgent or key messages to the top of the feed
- **Manage Join Requests** — approve or decline members who request to join your group
- **Manage Members** — view your group's member list, remove inactive members, appoint co-leaders

### For Admins (in addition to all of the above)
- **Approve New Members** — review and approve registration requests before a member can log in
- **Add Single Member** — manually add one member at a time to the directory
- **Bulk Import Members** — import the existing parish roll via spreadsheet (CSV/Excel)
- **Manage All Profiles** — edit any member's profile details; activate, disable or restore accounts
- **Create & Manage Groups** — create new parish groups, archive inactive ones
- **Post Parish-Wide Bilingual Announcements** — send English + Malayalam messages to the entire parish or a specific group
- **Admin Dashboard** — live overview: total members, pending approvals, active groups, upcoming events

---

## How Registration Works

1. A new member opens the app and enters their **Indian mobile number**
2. They receive a **6-digit OTP** via SMS — no password needed
3. On first login, their account is created with status **"Pending Approval"**
4. They fill in their **profile details** (name, house name, address, family members) and optionally upload photos
5. An **Admin reviews and approves** their registration
6. Once approved, the member has **full access** to the app

> **Pre-registered members** (imported via bulk import by Admin) are automatically activated the first time they log in with their registered mobile number.

---

## Bilingual Posts — How They Work

All announcements (both Admin and Group Leader posts) support **English + Malayalam**:

- Write the message in **English** (required)
- Optionally add a **Malayalam version**
- A **"Draft →"** button converts English text to Malayalam script phonetically (useful for names and church terms)
- The Admin/Leader **reviews and corrects** the Malayalam draft before posting
- A **review checkbox** must be ticked before the Post button activates — ensuring no unreviewed machine output is published
- In the feed, **Malayalam text appears first** (primary), English below it (secondary)

> Note: "Draft →" does phonetic script conversion (transliteration), not semantic translation. The admin must write or review proper Malayalam.

---

## Screen Layout

The app adapts to the device being used:

| Device | Navigation | Content Width |
|---|---|---|
| **Phone** | Bottom tab bar (Home, Groups, Directory, Calendar, Profile, Admin) | Full phone width |
| **Tablet / Desktop** | Fixed left sidebar with full labels | Wider content area |

---

## Key Design Principles

- **Privacy First** — all member data is protected by Row Level Security; members only see what they are allowed to see
- **Offline Ready** — works in poor network conditions; installable as a home-screen app
- **Bilingual** — English and Malayalam throughout, with phonetic transliteration assistance
- **Responsive** — optimised for phones; also works well on tablets and desktop computers
- **Photo-enabled** — profile pictures and family photos stored securely in Supabase Storage

---

## Technical Overview (for office reference)

| Item | Detail |
|---|---|
| **Hosting** | Vercel (free tier) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth — phone OTP via SMS |
| **Storage** | Supabase Storage (avatars, cover images) |
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **PWA** | Service Worker, Web Push Notifications |
| **Source Code** | GitHub — Morpheus61/alleppey_marthoma |

---

*Last updated: 2026-07-16*
