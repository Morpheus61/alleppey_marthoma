import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Profile } from '@/types/database'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const t = await getTranslations('admin')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profileRow = data as Profile | null

  if (!profileRow?.is_admin) redirect('/')

  // Overview stats
  const [
    { count: totalMembers },
    { count: pendingCount },
    { count: groupCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_archived', false),
  ])

  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: upcomingEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', weekFromNow)

  // Pending approvals
  const { data: pendingData } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')
    .limit(20)
  const pendingProfiles = pendingData as Profile[] | null

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">{t('title')}</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('totalMembers'), value: totalMembers ?? 0 },
          { label: t('pendingApprovals'), value: pendingCount ?? 0, highlight: (pendingCount ?? 0) > 0 },
          { label: t('totalGroups'), value: groupCount ?? 0 },
          { label: t('upcomingEvents'), value: upcomingEvents ?? 0 },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-xl border bg-card p-4 shadow-sm text-center ${highlight ? 'border-amber-400 bg-amber-50' : ''}`}
          >
            <p className="text-3xl font-bold text-brand-900">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      {pendingProfiles && pendingProfiles.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{t('pendingApprovals')}</h2>
          <div className="space-y-2">
            {pendingProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-sm text-muted-foreground">{p.phone}</p>
                  {p.house_name && (
                    <p className="text-xs text-muted-foreground">{p.house_name}</p>
                  )}
                </div>
                {/* Approve/Decline — Stage 4 wires these to Server Actions */}
                <div className="flex gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground italic">Stage 4</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="font-medium">Full admin dashboard in Stage 4</p>
        <p className="text-sm mt-1">Group creation · Leader appointment · Member assignment · Bulk import</p>
      </div>
    </main>
  )
}
