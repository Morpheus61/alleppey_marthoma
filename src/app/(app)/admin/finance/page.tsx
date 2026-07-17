import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Finance Dashboard' }

export default async function FinanceDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check finance role access
  const { data: roleRow } = await supabase
    .from('parish_roles').select('role')
    .eq('profile_id', user.id)
    .in('role', ['deacon','treasurer','admin','super_admin'])
    .is('revoked_at', null)
    .maybeSingle()
  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!roleRow && !profileData?.is_admin) redirect('/admin')

  // Pending verifications
  const { data: pending, count: pendingCount } = await supabase
    .from('contribution_entries')
    .select('id, amount, channel, created_at, utr, family_id', { count: 'exact' })
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })

  // Funds summary
  const { data: funds } = await supabase
    .from('funds')
    .select('id, name, name_ml')
    .eq('is_active', true)

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pendingCount ?? 0} submissions awaiting verification
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: '/admin/finance/verify',    label: 'Verify Payments',   badge: pendingCount ?? 0 },
          { href: '/admin/finance/cash-entry', label: 'Record Cash',      badge: 0 },
          { href: '/admin/finance/collections',label: 'Collections',      badge: 0 },
          { href: '/admin/finance/arrears',    label: 'Arrears by Bhagam', badge: 0 },
          { href: '/admin/finance/settings',   label: 'Settings (UPI/Bank)', badge: 0 },
          { href: '/admin/finance/reports',    label: 'Reports',           badge: 0 },
        ].map(({ href, label, badge }) => (
          <Link key={href} href={href}
            className="relative bg-white rounded-xl border border-amber-100 px-4 py-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-sm font-semibold text-brand-900">
            {label}
            {badge > 0 && (
              <span className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Verification queue preview */}
      {(pending ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-brand-900">Pending Verification</h2>
            <Link href="/admin/finance/verify" className="text-xs text-brand-700 underline underline-offset-2">View all →</Link>
          </div>
          <div className="space-y-2">
            {(pending ?? []).slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-50 px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">₹{e.amount} · <span className="capitalize">{e.channel.replace(/_/g,' ')}</span></p>
                  {e.utr && <p className="text-xs text-muted-foreground">UTR: {e.utr}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <Link href={`/admin/finance/verify?entry=${e.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-900 border border-brand-200 hover:bg-brand-100">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Funds list */}
      {(funds ?? []).length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No funds configured yet.</p>
          <p className="text-xs mt-1">Run migration 013, then create funds via the Collections page or from the Vicar's config file.</p>
        </div>
      )}
    </div>
  )
}
