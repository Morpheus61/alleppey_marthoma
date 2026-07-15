import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import InstallPrompt from '@/components/layout/InstallPrompt'
import HeaderNav from '@/components/layout/HeaderNav'
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
      {/* ── Branded header with back button + sign out ── */}
      <HeaderNav isAdmin={profile.is_admin ?? false} />

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
