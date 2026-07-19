/**
 * IST (Indian Standard Time) date utilities — UTC+05:30
 *
 * All display and query-window calculations in this app must use IST.
 * JavaScript's `new Date()` returns UTC; without the offset correction,
 * events between midnight IST and 05:30 UTC appear on the wrong day.
 */

export const IST_TZ = 'Asia/Kolkata' as const

// Millisecond offset for UTC→IST arithmetic (5h 30m)
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

/**
 * Returns today's date string in IST as 'YYYY-MM-DD'.
 * Safe to call server-side or client-side.
 */
export function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * Returns an IST-aware Date at the 1st of the month that is `months`
 * before/after the current IST month.  (Used for calendar window start.)
 */
export function startOfMonthIST(monthOffset: number): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  ist.setUTCMonth(ist.getUTCMonth() + monthOffset, 1)
  ist.setUTCHours(0, 0, 0, 0)
  // Shift back from IST noon to actual UTC
  return new Date(ist.getTime() - IST_OFFSET_MS)
}

/**
 * Returns an IST-aware Date at the last day of the month that is `months`
 * after the current IST month.  (Used for calendar window end.)
 */
export function endOfMonthIST(monthOffset: number): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  // setUTCDate(0) = last day of the previous month
  ist.setUTCMonth(ist.getUTCMonth() + monthOffset + 1, 0)
  ist.setUTCHours(23, 59, 59, 999)
  return new Date(ist.getTime() - IST_OFFSET_MS)
}

/**
 * Returns an ISO timestamp for "N days from now" in IST.
 * Used for short query windows like "events this week".
 */
export function nowPlusDaysIST(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}

// ─── Display helpers ────────────────────────────────────────────────────────

type DateFmtOpts = Omit<Intl.DateTimeFormatOptions, 'timeZone'>

/**
 * Format a date string (YYYY-MM-DD) or ISO timestamp for display in IST.
 */
export function fmtDate(s: string | null | undefined, opts?: DateFmtOpts): string {
  if (!s) return ''
  // Date-only strings: append IST midnight so it doesn't shift to the previous day
  const iso = s.length === 10 ? s + 'T00:00:00+05:30' : s
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: IST_TZ, ...opts })
}

/**
 * Format an ISO timestamp as a time string in IST.
 */
export function fmtTime(s: string, opts?: DateFmtOpts): string {
  return new Date(s).toLocaleTimeString('en-IN', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  })
}

/**
 * Format an ISO timestamp as "Weekday, D Month" in IST.
 */
export function fmtEventDate(s: string): string {
  return new Date(s).toLocaleDateString('en-IN', {
    timeZone: IST_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
