import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import InstallPrompt from '@/components/layout/InstallPrompt'
import Image from 'next/image'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('profiles')
    .select('status, is_admin, full_name')
    .eq('id', user.id)
    .single()
  const profile = data as Pick<Profile, 'status' | 'is_admin' | 'full_name'> | null

  if (!profile) redirect('/auth/login')
  if (profile.status === 'pending') redirect('/auth/pending')
  if (profile.status !== 'active') redirect('/auth/disabled')

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f0e3]">
      {/* ── Branded header ── */}
      <header className="sticky top-0 z-40 bg-[#fdf6eb] border-b border-amber-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2 max-w-lg mx-auto">
          <Link href="/" aria-label="Home">
            <Image
              src="/MarThoma_logo.png"
              alt="St. George Marthoma Church"
              width={40}
              height={40}
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
          {profile.is_admin && (
            <Link
              href="/admin"
              className="shrink-0 bg-brand-900 text-white text-[10px] font-bold px-2 py-1 rounded-full tracking-wide"
            >
              ADMIN
            </Link>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* ── Bottom navigation ── */}
      <BottomNav isAdmin={profile.is_admin ?? false} />

      {/* ── PWA Install prompt ── */}
      <InstallPrompt />
    </div>
  )
}
