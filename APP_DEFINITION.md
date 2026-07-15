# St. George Marthoma Church — Community App

**App Name:** St. George Marthoma Church (SGM Church)  
**Parish:** Alappuzha (Alleppey), Kerala, India  
**Denomination:** Marthoma Syrian Church of Malabar  
**Languages:** English & Malayalam  
**Platform:** Progressive Web App (PWA) — works on any phone or desktop browser, installs like a native app

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
- **My Profile** — save your full name (English & Malayalam), house name, address, date of birth, phone numbers, and family members
- **Parish Directory** — browse and search all active parish members (admin-approved access)
- **Parish Calendar** — view upcoming services, events, and programmes
- **Groups** — see all parish groups (prayer groups, youth fellowship, committees, etc.)
- **Group Feed** — read announcements and messages from groups you belong to
- **Push Notifications** — get reminders for upcoming events on your phone

### For Group Leaders (in addition to the above)
- **Post Announcements** — publish messages to your group's feed (members-only or public)
- **Pin Important Messages** — pin urgent or key messages to the top of the feed
- **Manage Join Requests** — approve or decline members who request to join your group
- **Manage Members** — view your group's member list, remove inactive members, appoint co-leaders

### For Admins (in addition to all of the above)
- **Approve New Members** — review and approve registration requests before a member can log in
- **Manage All Profiles** — edit any member's profile details, change their status (active/disabled)
- **Create & Manage Groups** — create new parish groups, archive inactive ones
- **Post Parish-Wide Announcements** — send messages visible to the entire parish
- **Bulk Import Members** — import the existing parish roll via spreadsheet (CSV/Excel)
- **Admin Dashboard** — live overview: total members, pending approvals, active groups, upcoming events

---

## How Registration Works

1. A new member opens the app and enters their **Indian mobile number**
2. They receive a **6-digit OTP** via SMS — no password needed
3. On first login, their account is created with status **"Pending Approval"**
4. They must fill in their **profile details** (name, house name, address, family members)
5. An **Admin reviews and approves** their registration
6. Once approved, the member has **full access** to the app

> **Pre-registered members** (imported via bulk import by Admin) are automatically activated the first time they log in with their registered mobile number.

---

## Key Design Principles

- **Privacy First** — all member data is protected by Row Level Security; members only see what they are allowed to see
- **Offline Ready** — works in poor network conditions; installable as a home-screen app
- **Bilingual** — all key labels available in English and Malayalam
- **Mobile First** — designed for small phone screens; touch-friendly UI

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
