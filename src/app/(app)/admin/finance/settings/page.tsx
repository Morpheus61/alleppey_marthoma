import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateSettings } from '../actions'

export const metadata = { title: 'Finance Settings' }

export default async function FinanceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  const { data: settings } = await supabase.from('app_settings').select('key, value')
  const s = (k: string) => settings?.find(x => x.key === k)?.value ?? ''

  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white font-mono'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Finance Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">UPI/bank details and collection configuration</p>
      </div>

      <form action={updateSettings} className="space-y-5">
        <section className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">UPI Details</p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">UPI ID (VPA)</label>
            <input name="church_upi_id" defaultValue={s('church_upi_id')} placeholder="church.name@bank" className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Payee Name (shown on UPI apps)</label>
            <input name="church_upi_name" defaultValue={s('church_upi_name')} placeholder="St George Marthoma Church" className={inp} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Bank Transfer Details</p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Bank Name</label>
            <input name="church_bank_name" defaultValue={s('church_bank_name')} placeholder="Bank of ..." className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Account Number</label>
            <input name="church_bank_account" defaultValue={s('church_bank_account')} placeholder="Account number" className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">IFSC Code</label>
            <input name="church_bank_ifsc" defaultValue={s('church_bank_ifsc')} placeholder="XXXX0000000" className={inp} />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Collection Settings</p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Receipt Prefix</label>
            <input name="receipt_prefix" defaultValue={s('receipt_prefix') || 'SGM-D-'} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Masavari Start Year</label>
            <input name="masavari_start_year" type="number" defaultValue={s('masavari_start_year') || '2024'}
              min="2020" max="2030" className={inp} />
            <p className="text-[11px] text-muted-foreground mt-1">Month ledger shown from January of this year</p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Certificate Settings</p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Vicar Name (auto-fills certificate forms)</label>
            <input name="vicar_name" defaultValue={s('vicar_name')} placeholder="Rev. Full Name" className={inp} />
            <p className="text-[11px] text-muted-foreground mt-1">Update whenever the vicar changes</p>
          </div>
        </section>

        <button type="submit"
          className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 transition-colors">
          Save Settings
        </button>
      </form>
    </div>
  )
}
