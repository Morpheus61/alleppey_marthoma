import { createBrowserClient } from '@supabase/ssr'

const PERSISTENT_MAX_AGE = 60 * 60 * 24 * 365  // 1 year

// Helper: parse document.cookie into the array format @supabase/ssr expects
function getAllCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return []
  return document.cookie.split(';').map(c => {
    const [name, ...rest] = c.trim().split('=')
    return { name: name.trim(), value: decodeURIComponent(rest.join('=')) }
  }).filter(c => c.name !== '')
}

// Helper: write a single cookie with 1-year maxAge (or 0 for deletions)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setCookiePersistent(name: string, value: string, options: any = {}) {
  const isDelete = options.maxAge === 0 || options.maxAge < 0
  const maxAge  = isDelete ? 0 : PERSISTENT_MAX_AGE
  const path    = options.path    ?? '/'
  const sameSite = options.sameSite ?? 'Lax'
  const secure  = options.secure || (typeof location !== 'undefined' && location.protocol === 'https:')
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}`
  if (secure) str += '; Secure'
  document.cookie = str
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: getAllCookies,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            setCookiePersistent(name, value, options)
          )
        },
      },
    }
  )
}
