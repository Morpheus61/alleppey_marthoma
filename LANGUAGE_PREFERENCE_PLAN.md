# Language Preference Slice — Implementation Plan

**Project:** St. George Marthoma Church PWA (alleppey_marthoma)  
**Date:** 2026-07-17  
**Status:** ⏸ QUEUED — implement only after Registry Restructure (migrations 015/016 + claim flow) is shipped and verified  

---

## Scope Decision (final)

- **NO** app-wide UI string extraction into `next-intl` namespaces
- **UI stays English** throughout
- Language preference governs **content ordering** and **content-adjacent formatting** only
- `next-intl` plumbing stays as-is — do not remove, do not expand

---

## Section 1 — Language Selection at Login

### First-time choice
- First screen of `/auth/login` (before OTP entry): two large buttons
  - `മലയാളം`
  - `English`
  - No explanatory text — the choice is visually self-evident
- Choice stored in cookie immediately (pre-auth pages respect it where bilingual content exists)
- Persisted to `profiles.ui_language` on account activation

### Returning users
- If `ui_language` cookie or `profiles.ui_language` is set → skip the choice, apply directly
- No re-prompt on subsequent logins

### Language switcher in `/me`
- Small dropdown / toggle in Profile settings
- Updates both cookie and `profiles.ui_language` immediately
- No page reload required

---

## Section 2 — Content Ordering by Preference

### Feed, post, and announcement cards

| `ui_language` | Primary (larger) | Secondary (smaller, muted) |
|---|---|---|
| `ml` | `body_ml` | `body` (English) |
| `en` | `body` (English) | `body_ml` |

### Fallback rule
- If a post has only one language → render it as primary, full-size
- **Never** render an empty/blank card
- **No** "missing translation" labels

### Same rule applies everywhere
- Event titles: `title_ml` / `title`
- Group names: `name_ml` / `name`
- Post titles: `title_ml` / `title`
- Announcement cards on Home page

---

## Section 3 — Locale Formatting (content-adjacent only)

When `ui_language = 'ml'`:
- Post timestamps (e.g. "2 days ago", "3 Jul")
- Event dates and weekday names
- Relative times

Use `date-fns` Malayalam locale (`date-fns/locale/ml`) or `Intl` with `'ml-IN'`.

**Not localized:**
- Currency — always `₹` in both modes
- UI button labels, navigation, form labels — always English
- Error messages — always English

---

## Section 4 — Push Notifications

- Notification `title` and `body` use the **recipient's** `ui_language`
- If the source content has the recipient's language → use it
- Fallback: use whichever language the content has (never send a blank notification)

Example: recipient is `ml`, post has `body_ml` → notification body = `body_ml`  
Example: recipient is `ml`, post has only `body` (English) → notification body = `body`

---

## Section 5 — Vicar Review Workflow (provisional-term lifecycle)

### Schema addition (migration 017 or add to 015)

```sql
alter table public.life_event_types
  add column if not exists is_provisional boolean not null default true;

-- All current machine-drafted seeds are provisional
update public.life_event_types set is_provisional = true;
```

### Member-facing rendering
- **No difference** for provisional terms — members see the term as-is

### Admin registry UI
- Small **"⚠ pending Vicar confirmation"** chip on provisional terms
- Super Admin gets a one-tap **"Confirm"** button
  - Sets `is_provisional = false`
  - Audit-logged in `audit_log`
- Editing a term also clears the provisional flag

### `scripts/generate-ml-review.ts`

Generates a structured review sheet for the Vicar:

```
PROVISIONAL TERMS (requires Vicar sign-off)
─────────────────────────────────────────
⚠  Confirmation    | (Malayalam term TBD)
⚠  ...

CONFIRMED TERMS
─────────────────────────────────────────
✓  Baptism         | മാമ്മോദീസ
✓  Marriage        | വിവാഹം
...

GROUP NAMES (review only — no lifecycle)
─────────────────────────────────────────
  Church Choir     | ഗായകസംഘം
  ...

UI MESSAGE STRINGS (review only — no lifecycle)
─────────────────────────────────────────
  auth.pendingMessage | നിങ്ങളുടെ രജിസ്ട്രേഷൻ...
  ...
```

- Provisional rows appear first with ⚠
- Confirmed rows below with ✓
- Also includes `name_ml` from `src/messages/ml.json` and seed group names (review-only, no lifecycle)

### Launch checklist gate
> "Review sheet shows 0 provisional rows before go-live."

---

## Files to Create / Modify

| File | Action | What changes |
|---|---|---|
| `supabase/migrations/017_language_prefs.sql` | **Create** | `life_event_types.is_provisional` column + update seeds to `true` |
| `src/app/auth/login/page.tsx` | **Update** | Language picker (2 buttons) before OTP step |
| `src/lib/language.ts` | **Create** | Cookie helpers: `getLanguagePref()`, `setLanguagePref()` |
| `src/app/(app)/me/page.tsx` | **Update** | Language switcher in settings section |
| `src/app/(app)/groups/[slug]/feed/page.tsx` | **Update** | Content ordering by `ui_language` |
| `src/app/(app)/page.tsx` | **Update** | Announcement + event content ordering |
| `src/components/posts/PostCard.tsx` | **Create** | Reusable card respecting content ordering |
| `src/components/events/EventCard.tsx` | **Create/update** | Event title + date respects preference |
| `src/app/(app)/admin/registry/[id]/FamilyComponents.tsx` | **Update** | Show `is_provisional` chip + Confirm button |
| `src/app/(app)/admin/wave2-actions.ts` | **Update** | `confirmLifeEventType(id)` action |
| `scripts/generate-ml-review.ts` | **Create** | Generates Vicar review sheet |
| `src/i18n/request.ts` | **Minor update** | Read cookie for locale (already partly done) |

---

## Acceptance Criteria

- [ ] New user picks **മലയാളം** → logs in → feed shows Malayalam-primary posts, Malayalam dates; UI buttons remain English
- [ ] English-only post renders normally in Malayalam mode (no blank, no label)
- [ ] Preference survives logout/login and device reinstall (profile-backed via `profiles.ui_language`)
- [ ] Review sheet generates and lists all `is_provisional = true` life_event_types with ⚠
- [ ] After Vicar confirms all terms: review sheet shows 0 provisional rows
- [ ] Language switcher in `/me` updates immediately (cookie + DB)

---

## Sequencing

```
BLOCKED: Registry Restructure (015/016 + claim flow) must ship first.

Once unblocked:
  1. Run migration 017 (is_provisional column + seed update)
  2. Create language cookie helper + update auth/login picker
  3. Update feed + home page content ordering
  4. Add is_provisional chip + Confirm button in admin registry
  5. Create generate-ml-review.ts script
  6. Run script → send review sheet to Vicar
  7. Update /me language switcher
  8. Acceptance test all criteria
  9. Ship
```

---

*Queued 2026-07-17. No code changes made. Awaiting Registry Restructure completion.*
