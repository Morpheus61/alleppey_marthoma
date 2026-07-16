import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import InstallPrompt from '@/components/layout/InstallPrompt'
import HeaderNav from '@/components/layout/HeaderNav'
import SidebarNav from '@/components/layout/SidebarNav'
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

  const isAdmin = profile.is_admin ?? false

  return (
    <div className="min-h-screen bg-[#f9f0e3]">
      {/* ── Top header — visible on all screen sizes ── */}
      <HeaderNav isAdmin={isAdmin} />

      {/* ── Body: sidebar (desktop) + content ── */}
      <div className="md:flex">
        {/* Desktop sidebar — hidden on mobile */}
        <SidebarNav isAdmin={isAdmin} />

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-8 min-h-[calc(100vh-52px)] overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — mobile only ── */}
      <BottomNav isAdmin={isAdmin} />

      {/* ── PWA install prompt ── */}
      <InstallPrompt />
    </div>
  )
}
