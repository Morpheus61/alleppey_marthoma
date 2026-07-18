import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { recordCashEntry } from '../actions'

export const metadata = { title: 'Record Cash Payment' }

export default async function CashEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  const { data: types } = await supabase
    .from('contribution_types')
    .select('id, name, name_ml, kind, amount, amount_mode')
    .eq('is_active', true)
    .order('name')

  const { data: families } = await supabase
    .from('family_units')
    .select('id, house_name, house_name_ml, groups!prayer_group_id(name, name_ml)')
    .order('house_name')

  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Record Cash Payment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Directly record a cash receipt — auto-verified</p>
      </div>

      <form action={recordCashEntry} className="bg-white rounded-xl border border-amber-100 p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Household *</label>
          <select name="family_id" required className={inp}>
            <option value="">Select household…</option>
            {(families ?? []).map(f => {
              const grp = f.groups as { name: string; name_ml: string | null } | null
              return (
                <option key={f.id} value={f.id}>
                  {f.house_name_ml ? `${f.house_name_ml} / ` : ''}{f.house_name}
                  {grp ? ` — ${grp.name_ml ?? grp.name}` : ''}
                </option>
              )
            })}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Collection Type *</label>
          <select name="contribution_type_id" required className={inp}>
            <option value="">Select type…</option>
            {(types ?? []).map(t => (
              <option key={t.id} value={t.id}>
                {t.name_ml ? `${t.name_ml} / ` : ''}{t.name}
                {t.amount ? ` — ₹${t.amount}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (₹) *</label>
          <input type="number" name="amount" min="1" step="0.01" required placeholder="0.00" className={inp} />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Month (for Masavari)</label>
          <input type="month" name="period_month" className={inp} />
          <p className="text-[10px] text-muted-foreground mt-1">Leave blank for one-time collections</p>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes (optional)</label>
          <input type="text" name="notes" placeholder="Any additional details…" className={inp} />
        </div>

        <button type="submit"
          className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 transition-colors">
          Record Cash Receipt
        </button>
      </form>
    </div>
  )
}
