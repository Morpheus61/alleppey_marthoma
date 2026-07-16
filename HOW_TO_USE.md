# How to Use — St. George Marthoma Church App
### Simple Guide for Members, Group Leaders & Admins

*Last updated: 2026-07-16*

---

## SECTION 1 — For Every Parish Member

### Getting Started: How to Sign In

1. Open the app on your phone or computer browser (or from your home screen if installed as a PWA)
2. Enter your **10-digit Indian mobile number** (e.g. 9876543210)
3. Tap **"Send OTP"**
4. You will receive a **6-digit code** on your phone via SMS
5. Enter the code and tap **"Verify & Sign In"**

> You do **not** need a password. Your mobile number is your identity.

---

### First Time? Fill In Your Profile

After your first login, your account is **Pending Approval**. You will see a message saying the church office needs to approve you.

**While waiting for approval, fill in your details:**

1. Tap **Profile** (bottom bar on phone, or left sidebar on desktop)
2. At the top of the form you will see two photo upload buttons:
   - **Profile Picture** (round circle) — tap to upload your personal headshot
   - **Family Photo** (wide rectangle) — tap to upload a household group photo
   - *(Photos save instantly — no need to press Save)*
3. Fill in all your details:
   - Full Name (English)
   - Full Name in Malayalam *(tap the “Type → മലയാളം” button to auto-convert phonetically)*
   - Date of Birth
   - House Name / Family Name
   - Address
   - Phone (landline if any)
   - WhatsApp number (or tick “My mobile is my WhatsApp number”)
   - Email address
4. Add **Family Members** — tap “Add Family Member” for each person in your household:
   - Name (English + Malayalam)
   - Relation (Spouse, Son, Daughter, etc.)
   - Date of Birth
5. Tap **“Save Details”** — a green tick ✓ confirms it saved

Once the Admin approves you, you will have full access.

---

### Navigating the App

**On a phone:** A **bottom tab bar** appears at the bottom of the screen.  
**On a desktop or tablet:** A **sidebar** on the left side shows all navigation labels.

| Icon / Label | What It Opens |
|---|---|
| 🏠 **Home** | Welcome screen with announcements and upcoming events |
| 👥 **Groups** | List of all parish groups |
| 📖 **Directory** | Full parish member directory with photos |
| 📅 **Calendar** | Upcoming church events and services |
| 👤 **Profile** | Your personal profile, photos and family details |
| 🛡 **Admin** | Admin Dashboard *(visible to admins only)* |

---

### Viewing Your Groups

1. Tap **Groups** in the bottom bar
2. You will see all active parish groups (prayer groups, youth fellowship, committees, etc.)
3. Tap any group to see its description and leaders
4. If you are a member of that group, tap **"View Feed"** to read announcements

---

### Seeing a Group's Announcements (Feed)

- You can only read a group's feed if you are **an approved member** of that group
- Posts show **Malayalam text first** (if the leader added it), English below
- 📌 Pinned messages always appear at the top
- If a group shows “Join this group to see its feed”, contact your Group Leader or Admin to be added

---

### The Parish Directory

- Tap **Directory** in the navigation
- Shows all active parish members, grouped alphabetically
- Each member card shows their **family photo** (wide banner) and **profile picture** (small circle)
- Tap the green WhatsApp icon to open a chat directly
- Search by name, house name, or address using the search box

---

### Notifications

- The app can send you **push notifications** for upcoming events
- When prompted, tap **"Allow Notifications"**
- You will get a reminder before events you are part of

---

### Signing Out

- **On phone:** Tap **Profile** → tap the sign-out button (→|) in the top-right of the header
- **On desktop:** The sign-out button is always visible in the top-right corner of the header**

---

---

## SECTION 2 — For Group Leaders

*As a Group Leader you have everything Members have, PLUS the ability to manage your group.*

### Finding Your Group Management Page

1. Tap **Groups** in the navigation
2. Find your group and tap it → opens the Group public page
3. If you are a leader, a **“Manage Group”** button appears at the top
4. Tap it to open the Management page

Alternatively, go directly to: `alleppey-marthoma.vercel.app/manage/your-group-name`

---

### Posting a Bilingual Message to Your Group

1. Open your Group Management page
2. In the **“Post Message”** composer:
   - Write **English** in the left column, OR **Malayalam** in the right column, OR **both**
   - At least **one language** must have content — Malayalam-only posts are fully valid
3. To convert English to Malayalam phonetically, click **“Draft →”**
   - ⚠️ This converts letters, NOT meaning — rewrite the draft in proper Malayalam
   - Tick the **“I have read the Malayalam”** box before proceeding
4. Click **“Preview & Post →”**
5. Review the exact feed card that members will see, then click **“Send”** to confirm

---

### Approving Join Requests

When a member requests to join your group, you will see a **"Join Requests"** section on the Manage Page:

- Tap **"Approve"** to add them as a member
- Tap **"Decline"** to reject the request

---

### Managing Your Group's Members

On the Manage Page, scroll down to see **“Active Members”**:

| Button | What It Does |
|---|---|
| **Remove** | Removes them from the group (they can request to rejoin) |

> **Note:** Only Admins can appoint or revoke Group Leaders. This is enforced at the database level.

---

### Things Group Leaders CANNOT Do

- Create or delete groups (Admin only)
- Appoint or revoke Group Leaders (Admin only — enforced by database security)
- Change a member’s name, phone number, or status (Admin only)
- Approve new members for the parish (Admin only)
- Access another group’s management page

---

---

## SECTION 3 — For Admins (Vicar / Church Office)

*Admins have full control over the entire app.*

### The Admin Dashboard

1. Sign in with your admin account
2. Tap the **Admin** link in the top navigation bar (visible only to admins)
3. The dashboard shows:
   - Total active members
   - Members waiting for approval
   - Number of active groups
   - Events happening this week

---

### Approving a New Member

When someone registers, they appear in **“Pending Approvals”** on the Admin Dashboard:

1. Review their name and phone number
2. Tap **“Approve”** — they immediately get full access
3. Tap **“Decline”** — their account is disabled

> New members **cannot use the app** until you approve them.

---

### Adding a Single Member (Manual Entry)

1. Go to **Directory** page → **“Add Single Member”** panel
2. Fill in: Full Name, Mobile Number (10-digit, required), House Name, and Status
3. Tap **“Add Member”**

The member will be auto-activated the first time they sign in with that mobile number.

---

### Disabling a Member

From the **Directory**:
1. Find the member in the active list
2. Tap the **🚧 (red UserX)** icon next to their name
3. Confirm the dialog

To **re-activate**: scroll to the bottom of the Directory → tap **“✓ (green UserCheck)”** next to their name.

---

### Editing Any Member’s Profile

1. **Directory** → find the member → tap the **✏️ (pencil)** icon
2. Edit any field: name, address, family members, status
3. Status options:
   - **Active** — normal access
   - **Pending** — back to waiting state
   - **Disabled** — blocks their access
4. Tap **“Save Details”****

---

### Creating a New Group

1. On the Admin Dashboard, scroll to **"Groups"**
2. Fill in:
   - **Group Name** (English)
   - **Group Name** (Malayalam) — optional
   - **Slug** — a short URL-friendly name, e.g. `prayer-group` or `youth-fellowship` *(no spaces, use hyphens)*
   - **Type**: Functional / Prayer / Youth
3. Tap **"Create Group"**
4. The group immediately appears in the Groups list

---

### Archiving a Group

If a group is no longer active:
1. Admin Dashboard → Groups
2. Find the group and tap **"Archive"**
3. Archived groups are hidden from members but data is kept

To bring it back, tap **"Unarchive"**.

---

### Posting a Parish-Wide Bilingual Announcement

1. Admin Dashboard → **“Post Announcement”**
2. Write in **English** and/or **Malayalam** — at least one language is required
3. Click **“Preview & Post →”** — review the rendered feed card
4. Click **“Send”** to confirm

---

### Appointing a Group Leader

1. Admin Dashboard → Groups → tap **Manage** for the relevant group
2. Scroll to **“Members”**
3. Find the member → tap **“Make Leader”**
4. To remove leader status: tap **“Revoke Leader”**

> Only Admins can appoint or revoke Group Leaders. This is enforced at the database level — group leaders cannot promote other members to leader.

---

### The Vicar’s Admin Access

The Vicar signs in with their mobile number (OTP) like any other member. The app recognises them as Admin because their profile has `is_admin = true` in the database.

To grant admin access: Admin Dashboard → Members → tap **“Make Admin”** next to their name.**

---

### Bulk Importing Members

*(For migrating your existing parish roll into the app)*

1. Go to **Directory** page
2. Tap **"Import Members"** panel
3. Prepare a CSV/Excel file with columns: `full_name`, `phone`, `house_name`
4. Upload the file
5. Members are imported with **status = pending** — they will be auto-activated when they first log in with their registered phone number

---

### Making Someone an Admin

1. Admin Dashboard → Members List
2. Find the member
3. Tap **"Make Admin"** (or **"Revoke Admin"** to remove admin rights)

> ⚠️ Only give Admin access to trusted people like the Vicar, Secretary, or Treasurer.

---

### Things to Remember as Admin

- **Always approve new members promptly** — members in "Pending" state cannot use the app at all
- **Keep the Groups list clean** — archive groups that are no longer active
- **Do not disable a member's account without reason** — contact them first
- **The directory is only visible to approved (active) members** — your data is protected

---

## Common Questions

**Q: I filled in my profile but nothing was saved.**  
A: Make sure you tapped “Save Details” and saw the green ✓ confirmation. If you see a red error box, take a screenshot and send it to the app admin.

**Q: I uploaded a photo but it still shows the old one.**  
A: Photos upload instantly when you select them. If the old photo still shows, do a hard reload (hold Ctrl and press Reload) or clear the browser cache.

**Q: I can’t see the Group Feed.**  
A: You need to be an approved member of that group. Contact your Group Leader or the Admin to be added.

**Q: The app shows “Registration Pending”.**  
A: Your account is waiting for Admin approval. Contact the church office or the Vicar.

**Q: Can I use the app on my computer?**  
A: Yes. Open it in Chrome, Edge, Safari, or Firefox. On desktop you get a sidebar navigation. On a phone you get the bottom tab bar. You can also install it to the home screen on both phone and desktop — no app store needed.

**Q: What does the “Draft →” button do for Malayalam?**  
A: It converts your English text phonetically into Malayalam script (e.g. “Thomas” → “തോമസ്”). It does NOT translate meaning — you must rewrite the draft in proper Malayalam before posting.

**Q: Is my personal data safe?**  
A: Yes. The app uses Row Level Security (PostgreSQL). Your phone number and family details are only visible to approved parish members and admins. **Date of birth, email and family members are never shown in the parish directory** — they are visible only to you and to Admins. No data is shared outside the parish.

---

*For technical support, contact the app administrator.*  
*For parish matters, contact the church office.*  
*Last updated: 2026-07-16*
