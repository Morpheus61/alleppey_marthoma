import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IST_TZ } from '@/lib/dates'

export const metadata = { title: 'Arrears by Bhagam' }

export default async function ArrearsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  // Get Masavari type
  const { data: masavariType } = await supabase
    .from('contribution_types')
    .select('id, name, amount')
    .eq('kind', 'subscription')
    .eq('is_active', true)
    .maybeSingle()

  // Get all prayer groups (Bhagams)
  const { data: bhagams } = await supabase
    .from('groups')
    .select('id, name, name_ml')
    .eq('group_type', 'prayer')
    .eq('is_archived', false)
    .order('name')

  // Get all families with their bhagam
  const { data: families } = await supabase
    .from('family_units')
    .select('id, house_name, house_name_ml, prayer_group_id')
    .order('house_name')

  // Get all verified/submitted Masavari entries
  const { data: entries } = masavariType
    ? await supabase
        .from('contribution_entries')
        .select('family_id, period_month, status')
        .eq('contribution_type_id', masavariType.id)
        .neq('status', 'rejected')
    : { data: [] }

  // Build paid months set per family
  const paidByFamily = new Map<string, Set<string>>()
  for (const e of (entries ?? [])) {
    if (!e.period_month || !e.family_id) continue
    const key = e.period_month.slice(0, 7) // YYYY-MM
    if (!paidByFamily.has(e.family_id)) paidByFamily.set(e.family_id, new Set())
    paidByFamily.get(e.family_id)!.add(key)
  }

  // Calculate outstanding months from Jan 2024 to current IST month
  const startYear = 2024
  const nowIST = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000)
  const now = nowIST
  const months: string[] = []
  let d = new Date(startYear, 0, 1)
  const currentMonth = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1)
  while (d <= currentMonth) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  const totalMonths = months.length
  const monthlyRate = masavariType?.amount ?? 300

  // Group families by bhagam with arrears
  const bhagamMap = new Map<string, { name: string; name_ml: string | null; families: { id: string; name: string; outstanding: number; months: number }[] }>()
  for (const b of (bhagams ?? [])) {
    bhagamMap.set(b.id, { name: b.name, name_ml: b.name_ml, families: [] })
  }
  const unassigned: { id: string; name: string; outstanding: number; months: number }[] = []

  for (const f of (families ?? [])) {
    const paid = paidByFamily.get(f.id) ?? new Set<string>()
    const outstandingMonths = months.filter(m => !paid.has(m)).length
    if (outstandingMonths === 0) continue // all paid up
    const entry = { id: f.id, name: f.house_name_ml ? `${f.house_name_ml} / ${f.house_name}` : f.house_name, outstanding: outstandingMonths * monthlyRate, months: outstandingMonths }
    if (f.prayer_group_id && bhagamMap.has(f.prayer_group_id)) {
      bhagamMap.get(f.prayer_group_id)!.families.push(entry)
    } else {
      unassigned.push(entry)
    }
  }

  const totalArrears = [...bhagamMap.values(), { families: unassigned }].flatMap(b => b.families).reduce((s, f) => s + f.outstanding, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Arrears by Bhagam</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {masavariType ? `${masavariType.name} · ₹${monthlyRate}/month` : 'No Masavari type configured'} ·{' '}
          <span className="font-semibold text-red-600">Total outstanding: ₹{totalArrears.toLocaleString('en-IN')}</span>
        </p>
      </div>

      {!masavariType && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          No active subscription (Masavari) collection type found. Create one in Collections first.
        </div>
      )}

      {[...bhagamMap.entries()].map(([id, bhagam]) => {
        if (bhagam.families.length === 0) return null
        const total = bhagam.families.reduce((s, f) => s + f.outstanding, 0)
        return (
          <section key={id}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold text-brand-900">{bhagam.name_ml ?? bhagam.name}</h2>
                {bhagam.name_ml && <p className="text-xs text-muted-foreground">{bhagam.name}</p>}
              </div>
              <span className="text-xs font-bold text-red-600">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="space-y-1.5">
              {bhagam.families.sort((a, b) => b.outstanding - a.outstanding).map(f => (
                <div key={f.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-2.5 shadow-sm">
                  <p className="text-sm">{f.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">₹{f.outstanding.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-muted-foreground">{f.months} month{f.months !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {unassigned.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">No Bhagam Assigned</h2>
          <div className="space-y-1.5">
            {unassigned.sort((a, b) => b.outstanding - a.outstanding).map(f => (
              <div key={f.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-2.5 shadow-sm">
                <p className="text-sm">{f.name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">₹{f.outstanding.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-muted-foreground">{f.months} month{f.months !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {totalArrears === 0 && masavariType && (
        <div className="text-center py-12 text-green-600 font-semibold text-sm">
          ✓ All households are up to date!
        </div>
      )}
    </div>
  )
}
