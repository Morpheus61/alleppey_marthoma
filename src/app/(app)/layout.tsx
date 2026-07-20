import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'
import InstallPrompt from '@/components/layout/InstallPrompt'
import HeaderNav from '@/components/layout/HeaderNav'
import SidebarNav from '@/components/layout/SidebarNav'
import VicarComposeButton from '@/components/pulpit/VicarComposeButton'
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

  // Check parish_roles — fetch role for all management levels in one query
  const { data: roleRow } = await supabase
    .from('parish_roles')
    .select('role')
    .eq('profile_id', user.id)
    .in('role', ['deacon', 'treasurer', 'admin', 'super_admin'])
    .is('revoked_at', null)
    .order('role') // admin < deacon < super_admin < treasurer alphabetically — we pick highest below
    .limit(4)

  // Determine effective access level
  const roles = Array.isArray(roleRow) ? (roleRow as { role: string }[]).map(r => r.role) : []
  const isAdmin = !!(profile.is_admin || roles.includes('admin') || roles.includes('super_admin'))
  const isFinanceRole = roles.includes('deacon') || roles.includes('treasurer')

  // Admin tab destination: full admin for admins/super_admin; finance hub for deacon/treasurer
  const adminHref = isAdmin ? '/admin' : (isFinanceRole ? '/admin/finance' : null)

  return (
    <div className="min-h-screen bg-[#f9f0e3]">
      {/* ── Top header — visible on all screen sizes ── */}
      <HeaderNav isAdmin={isAdmin} />

      {/* ── Body: sidebar (desktop) + content ── */}
      <div className="md:flex">
        {/* Desktop sidebar — hidden on mobile */}
        <SidebarNav isAdmin={isAdmin} adminHref={adminHref} />

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-8 min-h-[calc(100vh-52px)] overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Bottom nav — mobile only ── */}
      <BottomNav isAdmin={isAdmin} adminHref={adminHref} />

      {/* ── PWA install prompt ── */}
      <InstallPrompt />

      {/* ── Vicar floating compose button (admin only) ── */}
      <VicarComposeButton isAdmin={isAdmin} />
    </div>
  )
}
