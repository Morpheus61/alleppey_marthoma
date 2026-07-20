'use client'

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, LogOut } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

// Root-level pages: no back button, just the logo
const ROOT_PATHS = new Set(['/', '/groups', '/calendar', '/me', '/directory', '/admin', '/pulpit'])

interface Props {
  isAdmin: boolean
}

export default function HeaderNav({ isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isRoot = ROOT_PATHS.has(pathname)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-[#fdf6eb] border-b border-amber-100 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 max-w-full min-h-[52px]">

        {/* Left: back button OR logo (logo hidden on desktop — sidebar shows it) */}
        {isRoot ? (
          <Link href="/" aria-label="Home" className="shrink-0 md:hidden">
            <Image
              src="/MarThoma_logo.png"
              alt="St. George Marthoma Church"
              width={38}
              height={38}
              className="rounded-full"
              priority
            />
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full hover:bg-amber-100 transition-colors text-brand-900"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
        )}

        {/* Centre: church name */}
        <div className="flex-1 min-w-0">
          <p className="text-brand-900 font-bold text-sm leading-tight truncate">
            St. George Marthoma Syrian Church
          </p>
          <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase">
            Alappuzha
          </p>
        </div>

        {/* Right: admin badge + sign out */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href="/admin"
              className="bg-brand-900 text-white text-[10px] font-bold px-2 py-1 rounded-full tracking-wide"
            >
              ADMIN
            </Link>
          )}
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-brand-900 hover:bg-amber-100 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>

      </div>
    </header>
  )
}
