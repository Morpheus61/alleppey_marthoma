# Pay Now — Feature Specification
**Project:** St. George Marthoma Church, Alappuzha PWA  
**Status:** QUEUED — implement after Calendar Phase 2  
**Last updated:** 2026-07-17

---

## 1. Overview

Members must be able to view their dues and submit payment evidence from the app.
Admin/Treasurer must be able to verify, reject, and record cash payments.
Masavari (monthly subscription ₹300) is a running account per household.

---

## 2. Database (already built — migrations 013 + 014)

| Table | Purpose |
|---|---|
| `funds` | Ledger buckets (General Fund, Charity Fund…) |
| `contribution_types` | Specific collections (Masavari, Building Fund, Birthday TKG…) |
| `contribution_entries` | Individual payment records (submitted → verified / rejected) |
| `receipt_counters` | Sequential receipt numbers: SGM-D-00001… |
| `app_settings` | Church UPI ID, bank details, receipt prefix, masavari_start_year |

### Masavari model
- `kind = 'subscription'`, `amount_mode = 'fixed'`, `amount = 300`
- Monthly obligation from `masavari_start_year` (in `app_settings`) to current month
- Outstanding = every month with no `contribution_entry` where `status IN ('submitted','verified')`
- Arrears view: grouped by Bhagam → family → months outstanding

---

## 3. App Settings Required (run in Supabase SQL Editor before going live)

```sql
INSERT INTO app_settings (key, value) VALUES
  ('church_upi_id',        'your.upi@bank'),
  ('church_upi_name',      'St George Marthoma Church Alappuzha'),
  ('church_bank_name',     'Bank Name'),
  ('church_bank_account',  'Account Number'),
  ('church_bank_ifsc',     'IFSC Code'),
  ('receipt_prefix',       'SGM-D-'),
  ('masavari_start_year',  '2024')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

## 4. Member Flow

### 4a. Finance page `/finance`

**Masavari section (top, mandatory):**
```
MASAVARI — MONTHLY SUBSCRIPTION                     ₹300 / month
──────────────────────────────────────────────────────
  Jan 2026  ✓ Verified        Mar 2026  ✗ Outstanding  [Pay]
  Feb 2026  ✓ Verified        Apr 2026  ✗ Outstanding  [Pay]
  May 2026  ⏳ Submitted       Jun 2026  ✗ Outstanding  [Pay]
  Jul 2026  ✗ Outstanding  [Pay]

  Total outstanding: ₹1,200 (4 months)   [Pay All Outstanding →]
```

**Voluntary collections (below):**
- Birthday Thanksgiving, Building Fund, Sunday Offertory, Wedding Anniversary
- Each shows as a card with [Pay Now] button

---

### 4b. Pay Now page `/finance/pay?type=<id>&month=<YYYY-MM-DD>`

**Step 1 — Amount confirmation**
- Collection name + description
- Amount (pre-filled for fixed; input for open/suggested)
- For Masavari: shows which month is being paid

**Step 2 — Choose payment method**

```
┌─────────────────────────────────────────────┐
│  Pay ₹300 — Masavari (Jul 2026)             │
│  Pandampurath / Motty Philip                │
├─────────────────────────────────────────────┤
│                                             │
│  [UPI / QR Code]  [Bank Transfer]  [Cash]  │
│                                             │
└─────────────────────────────────────────────┘
```

**UPI / QR tab:**
- QR code generated from:
  ```
  upi://pay?pa=<church_upi_id>
            &pn=St George Marthoma Church
            &am=300
            &cu=INR
            &tn=Masavari Jul 2026 - Pandampurath
  ```
- QR generated via: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=<encoded_url>`
- No additional packages required
- [Download QR] button — saves as PNG
- [Open in UPI App] button — opens `upi://` deep link on mobile (intent payment)
- After paying → [I've Paid] → shows UTR input

**Bank Transfer tab:**
- Shows bank name, account number, IFSC
- Reference to use: `<house_name> <month> <type>` e.g. "Pandampurath Masavari Jul 2026"
- [I've Paid] → shows UTR input

**Cash tab:**
- Message: "Visit the church office. Reference: [house_name] [type]"
- [Mark as Intending to Pay] → creates entry with `channel = 'cash'`, `status = 'submitted'`

**Step 3 — UTR Submission (UPI/Bank only)**
- UTR / Reference number input (required)
- Optional: Upload payment screenshot (goes to `payment-proofs` bucket)
- [Submit Payment] → creates `contribution_entry` with `status = 'submitted'`
- Toast: "Payment submitted! You'll receive a receipt once verified."

---

## 5. Admin / Treasurer Flow

### 5a. Admin Finance Dashboard `/admin/finance`
- Already built — shows pending count, links to sub-pages

### 5b. Verify Payments `/admin/finance/verify`
Queue of `status = 'submitted'` entries, ordered oldest first.

Each card shows:
- Family name, collection type, amount, month (for Masavari)
- Channel + UTR/reference
- Screenshot link (if uploaded)
- [Verify ✓] → sets `status = 'verified'`, assigns `receipt_number = next_receipt_number()`
- [Reject ✗] → modal asks for reason → sets `status = 'rejected'`, stores `reject_reason`

### 5c. Cash Entry `/admin/finance/cash-entry`
For payments collected in person:
- Family search (from registry)
- Collection type
- Amount
- Date
- Creates entry directly with `status = 'verified'` + receipt number

### 5d. Manage Collections `/admin/finance/collections`
CRUD for `contribution_types`:
- Name (EN + ML with transliterate)
- Fund assignment
- Kind (subscription / service offertory / appeal)
- Amount mode + amount
- Period window (start/end dates)
- Active toggle

---

## 6. Masavari Arrears (Admin) `/admin/finance/arrears`

Group by Bhagam → family → outstanding months:

```
THEKKU BHAGAM
  Pandampurath (Motty Philip)    ₹600 outstanding (2 months)
  [other families...]

PALLI-CHATHANAD BHAGAM
  [families...]
```

Export to PDF/Excel for collection rounds.

---

## 7. UPI Intent (Payment Gateway — Future)

Phase 2 option: Integrate Razorpay / PhonePe Business API.
- Replace QR with hosted payment link
- Webhook → auto-verify entry on successful payment
- No UTR submission needed

Current Phase 1 is sufficient for launch: QR + manual UTR verification.

---

## 8. Build Sequence

1. **`app_settings` admin form** — enter UPI/bank details (10 min)
2. **`/finance` Masavari section** — running account ledger (30 min)
3. **`/finance/pay`** — QR generation + UTR submission (45 min)
4. **`/admin/finance/verify`** — verification queue (30 min)
5. **`/admin/finance/cash-entry`** — cash recording (20 min)
6. **`/admin/finance/collections`** — CRUD for types (30 min)
7. **`/admin/finance/arrears`** — Masavari arrears by Bhagam (20 min)

**Total estimated: ~3 hours of focused build time**

---

## 9. Dependencies

- Migration 013 ✅ run
- Migration 014 ✅ run  
- `app_settings` populated with UPI/bank details ⬜ (admin must do this before QR works)
- Registry households linked to Bhagams ⬜ (needed for arrears grouping)
