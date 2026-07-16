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
| **Deacon** | Ward/Bhagam deacon — records cash contributions, views arrears |
| **Treasurer** | Verifies UPI/NEFT payments, finance dashboard, proposes reversals |
| **Admin / Secretary** | Church Secretary — manages members, groups, announcements, events |
| **Super Admin / Vicar** | The Vicar — full access, approves all change requests, grants all roles |

---

## What Can the App Do?

### For Every Member
- **Register & Sign In** — using your Indian mobile number (OTP-based, no password needed)
- **My Profile** — view your data as a formatted card (name, DOB, address, family members, photos); tap **Edit** to update
- **Profile Photo** — upload your own profile picture (round avatar)
- **Family Photo** — upload a household family photo (shown in the Parish Directory)
- **Parish Directory** — browse and search all active parish members, sectioned by Bhagam (ward)
- **Parish Calendar** — view upcoming services, events, and prayer meetings
- **Groups** — see all parish groups (prayer groups, youth fellowship, committees, etc.)
- **Group Feed** — read bilingual (English & Malayalam) announcements from your groups
- **My Subscriptions** — view your family’s payment history, submit UPI/NEFT payment declarations, see active collections
- **Push Notifications** — get reminders for upcoming events on your phone

### For Group Leaders (in addition to the above)
- **Post Bilingual Announcements** — publish English + Malayalam messages to your group’s feed (members-only or public)
- **Pin Important Messages** — pin urgent or key messages to the top of the feed
- **Manage Join Requests** — approve or decline members who request to join your group
- **Manage Members** — view your group’s member list, remove inactive members

### For Deacons (in addition to member access)
- **Record Cash Contributions** — enter cash payments for any family; receipt number generated immediately
- **Arrears by Bhagam** — view outstanding subscription arrears for their ward
- **Finance Dashboard** — read-only view of collections

### For Treasurers (in addition to Deacon access)
- **Verify UPI/NEFT Submissions** — review UTR number + screenshot, approve or reject
- **Collections Overview** — per fund, per Bhagam, per month, cash vs UPI
- **Propose Reversals** — submit correction requests for the Vicar to approve

### For Admins / Secretary (in addition to all of the above)
- **Approve New Members** — review and approve registration requests
- **Add / Import Members** — manual single-entry or bulk Excel/CSV import
- **Manage All Profiles** — edit member details; activate, disable or restore accounts
- **Create & Manage Groups** — create new parish groups, archive inactive ones
- **Post Parish-Wide Bilingual Announcements** — English + Malayalam messages to the entire parish
- **Parish Registry** — manage household records (family_units), family members, and life events (baptism, confirmation, marriage, death); add members to prayer groups and other groups from the registry
- **Propose Changes** — for registry/financial changes, submit a change request to the Vicar

### For the Vicar / Super Admin (full control)
- **Approvals Queue** — review old→new diff for every pending change request; Approve or Reject in 3 taps
- **Grant / Revoke Roles** — assign Deacon, Treasurer, Admin, or Super Admin to any member
- **Direct Registry Edits** — edit household and member records without a change request
- **Create Funds & Collections** — set up contribution types, amounts, and collection windows
- **Appoint Group Leaders** — only the Vicar can promote a member to Group Leader (enforced by database security)
- **Admin Dashboard** — live overview: members, pending approvals, groups, events this week

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

## Parish Registry

The app maintains a full household-based parish registry:

- **Households (Family Units)** — each family has a house name, address, and ward (Bhagam) assignment
- **Family Members** — every person in the household is registered with name (EN + ML), relation, date of birth, and gender
- **Profile Linking** — admin can link any registered member’s app account to their family member row; shows linked phone + tick badge
- **Group Enrolment** — from a household, admin can enrol selected family members into any group (prayer group assigned automatically; functional/youth groups can be chosen per-member)
- **Unlinked Profiles Panel** — the Registry list shows a banner of registered app members not yet linked to any household, with one-click link action
- **Life Events** — baptism, confirmation, marriage, death and other events are recorded with date, place, officiant, register number and certificate number. Events are never edited in place — corrections chain to preserve history.
- **Ward Assignment** — assigning a family to a prayer group (Bhagam) automatically adds all linked members to that ward’s group

---

## Finance & Contributions

- **Funds** — ledger categories (General Fund, Building Fund, etc.) created by the Vicar
- **Collection Types** — Masavari (monthly subscription), service offertory, appeals — with fixed/suggested/open amounts and collection windows
- **Member Submissions** — members declare UPI/NEFT payments with UTR number and screenshot; see “Submitted — awaiting verification” until verified
- **Cash Entry** — Deacons record cash payments; receipt number assigned immediately
- **Verification** — Treasurer checks UTR + screenshot and verifies or rejects
- **Receipts** — sequential receipt numbers (e.g. SGM-D-00001) assigned on verification
- **Reversals** — Treasurer/Admin proposes reversal via change request; Vicar approves; a negative linked entry is created. Originals are never deleted.

---

## Maker-Checker Approval Workflow

All changes to the registry, financial entries, or member data by non-Vicar staff go through:

1. **Staff submits a Change Request** — showing current vs proposed data
2. **Vicar reviews** in the Approvals Queue — a plain-language old→new diff, Approve or Reject
3. **On Approve** — the change is applied automatically and logged
4. **On Reject** — the staff member is notified with the Vicar’s reason

The Vicar’s own edits apply directly (no self-approval loop). All decisions are audit-logged.

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
| **Storage** | Supabase Storage (avatars, cover images, payment proofs) |
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **PWA** | Service Worker, Web Push Notifications |
| **Source Code** | GitHub — Morpheus61/alleppey_marthoma |

---

*Last updated: 2026-07-17 (Wave 2: Registry UI + Finance + Roles complete)*
