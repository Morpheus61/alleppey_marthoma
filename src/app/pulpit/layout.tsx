import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Public-accessible layout for The Pulpit (/pulpit and /pulpit/[id]).
 * Does NOT redirect unauthenticated visitors — the Pulpit is publicly readable.
 * Shows a slim header: church logo + Home (for members) or "Member sign in" (for guests).
 * /pulpit/compose has its own server-side admin guard.
 */
export default async function PulpitLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-[#f9f0e3]">
      {/* Slim header — no sidebar, minimal chrome */}
      <header className="sticky top-0 z-40 bg-[#fdf6eb] border-b border-amber-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2 min-h-[52px]">
          <Link href={isAuthenticated ? '/' : '/'} aria-label="Home" className="shrink-0">
            <Image
              src="/MarThoma_logo.png"
              alt="St. George Marthoma Church"
              width={38}
              height={38}
              className="rounded-full"
              priority
            />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-brand-900 font-bold text-sm leading-tight truncate">
              St. George Marthoma Syrian Church
            </p>
            <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase">
              Alappuzha
            </p>
          </div>
          {isAuthenticated ? (
            <Link
              href="/"
              className="shrink-0 text-xs font-semibold text-brand-900 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
            >
              ← Home
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="shrink-0 text-xs font-semibold text-white bg-brand-900 px-3 py-1.5 rounded-lg hover:bg-brand-800 transition-colors"
            >
              Member sign in
            </Link>
          )}
        </div>
      </header>

      <main className="pb-10">{children}</main>
    </div>
  )
}
