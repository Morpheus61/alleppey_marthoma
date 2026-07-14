/**
 * Normalise an Indian mobile number to E.164 format (+91XXXXXXXXXX).
 * Accepts: 9876543210, +919876543210, 91 9876543210, 98765-43210, etc.
 * Returns null if the number doesn't look like a valid 10-digit Indian mobile.
 */
export function normalizePhone(raw: string): string | null {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, '')

  let mobile: string

  if (digits.startsWith('91') && digits.length === 12) {
    mobile = digits.slice(2)
  } else if (digits.length === 10) {
    mobile = digits
  } else {
    return null
  }

  // Indian mobiles start with 6-9
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return null
  }

  return `+91${mobile}`
}
