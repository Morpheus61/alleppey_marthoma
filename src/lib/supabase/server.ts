import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 1 year in seconds — auth cookies are written with this maxAge so the session
// survives browser/PWA restarts ("OTP once per device" behaviour).
const PERSISTENT_MAX_AGE = 60 * 60 * 24 * 365

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Preserve cookie deletions (maxAge=0) but extend everything else
              // to 1 year so auth cookies outlive browser/PWA restarts.
              const isDelete = options?.maxAge === 0 || options?.maxAge < 0
              cookieStore.set(name, value, isDelete ? options : { ...options, maxAge: PERSISTENT_MAX_AGE })
            })
          } catch {
            // Called from Server Component; cookie mutations are ignored (expected)
          }
        },
      },
    }
  )
}
