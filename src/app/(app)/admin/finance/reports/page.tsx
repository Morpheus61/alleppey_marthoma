import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Finance Reports' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  // Overall totals by contribution type
  const { data: byType } = await supabase
    .from('contribution_entries')
    .select('amount, status, channel, contribution_type_id, contribution_types(name, name_ml, kind)')
    .neq('status', 'rejected')
    .neq('status', 'reversed')

  // Recent verified payments
  const { data: recent } = await supabase
    .from('contribution_entries')
    .select('id, amount, channel, receipt_number, created_at, verified_at, family_units!family_id(house_name, house_name_ml), contribution_types(name, name_ml)')
    .eq('status', 'verified')
    .order('verified_at', { ascending: false })
    .limit(20)

  // Totals summary
  const allEntries = byType ?? []
  const verified = allEntries.filter(e => e.status === 'verified')
  const submitted = allEntries.filter(e => e.status === 'submitted')
  const totalVerified = verified.reduce((s, e) => s + Number(e.amount), 0)
  const totalSubmitted = submitted.reduce((s, e) => s + Number(e.amount), 0)

  // Group verified by type
  const typeMap = new Map<string, { name: string; name_ml: string | null; kind: string; total: number; count: number }>()
  for (const e of verified) {
    const ct = e.contribution_types as unknown as { name: string; name_ml: string | null; kind: string } | null
    if (!ct || !e.contribution_type_id) continue
    if (!typeMap.has(e.contribution_type_id)) typeMap.set(e.contribution_type_id, { name: ct.name, name_ml: ct.name_ml, kind: ct.kind, total: 0, count: 0 })
    const t = typeMap.get(e.contribution_type_id)!
    t.total += Number(e.amount)
    t.count++
  }
  const typeRows = [...typeMap.values()].sort((a, b) => b.total - a.total)

  const channelTotals = { cash: 0, upi: 0, neft: 0 }
  for (const e of verified) {
    if (e.channel === 'cash') channelTotals.cash += Number(e.amount)
    else if (e.channel === 'upi_declared') channelTotals.upi += Number(e.amount)
    else if (e.channel === 'neft_declared') channelTotals.neft += Number(e.amount)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Finance Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All-time collection summary</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-green-100 px-4 py-4 shadow-sm">
          <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Total Collected</p>
          <p className="text-2xl font-bold text-green-700 mt-1">₹{totalVerified.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">{verified.length} receipts verified</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 px-4 py-4 shadow-sm">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Pending Verification</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{totalSubmitted.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">{submitted.length} submissions pending</p>
        </div>
      </div>

      {/* By channel */}
      <section>
        <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-3">By Channel</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Cash', value: channelTotals.cash },
            { label: 'UPI', value: channelTotals.upi },
            { label: 'Bank Transfer', value: channelTotals.neft },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-amber-100 px-3 py-3 shadow-sm text-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">{label}</p>
              <p className="text-base font-bold text-brand-900 mt-0.5">₹{value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* By collection type */}
      <section>
        <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-3">By Collection Type</h2>
        <div className="space-y-2">
          {typeRows.map(t => (
            <div key={t.name} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
              <div>
                {t.name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{t.name_ml}</p>}
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{t.kind} · {t.count} receipt{t.count !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm font-bold text-brand-900">₹{t.total.toLocaleString('en-IN')}</p>
            </div>
          ))}
          {typeRows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No verified collections yet</p>}
        </div>
      </section>

      {/* Recent verified payments */}
      <section>
        <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-3">Recent Verified Payments</h2>
        <div className="space-y-2">
          {(recent ?? []).map(e => {
            const fu = e.family_units as unknown as { house_name: string; house_name_ml: string | null } | null
            const ct = e.contribution_types as unknown as { name: string; name_ml: string | null } | null
            return (
              <div key={e.id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-50 px-4 py-2.5 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{fu?.house_name_ml ? `${fu.house_name_ml} / ` : ''}{fu?.house_name}</p>
                  <p className="text-xs text-muted-foreground">{ct?.name_ml ?? ct?.name} · <span className="capitalize">{e.channel.replace(/_/g,' ')}</span></p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-brand-900">₹{Number(e.amount).toLocaleString('en-IN')}</p>
                  {e.receipt_number && <p className="text-[10px] text-muted-foreground">{e.receipt_number}</p>}
                </div>
              </div>
            )
          })}
          {(recent ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No verified payments yet</p>}
        </div>
      </section>
    </div>
  )
}
