import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'My Subscriptions' }

export default async function MemberFinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('status, family_member_id')
    .eq('id', user.id).single()
  if (profileData?.status !== 'active') redirect('/')

  // Find the member's family — prefer profiles.family_member_id (more reliable than family_members.profile_id)
  let familyMember: { family_id: string; family_units: unknown } | null = null

  if (profileData?.family_member_id) {
    const { data: fm } = await supabase
      .from('family_members')
      .select('family_id, family_units(house_name, house_name_ml)')
      .eq('id', profileData.family_member_id)
      .maybeSingle()
    familyMember = fm
  }

  // Fallback: check family_members.profile_id (covers older accounts)
  if (!familyMember) {
    const { data: fm } = await supabase
      .from('family_members')
      .select('family_id, family_units(house_name, house_name_ml)')
      .eq('profile_id', user.id)
      .maybeSingle()
    familyMember = fm
  }

  // App settings (bank details, UPI)
  const { data: settings } = await supabase.from('app_settings').select('key, value')
  const setting = (key: string) => settings?.find(s => s.key === key)?.value ?? ''

  // Active contribution types
  const { data: types } = await supabase
    .from('contribution_types')
    .select('id, name, name_ml, kind, amount_mode, amount, period_start, period_end, target_amount, target_visibility, funds(name, name_ml)')
    .eq('is_active', true)
    .order('name')

  // Masavari: fetch all entries for running account (no limit)
  const masavariType = (types ?? []).find(t => t.kind === 'subscription')
  const { data: masavariEntries } = (familyMember?.family_id && masavariType)
    ? await supabase
        .from('contribution_entries')
        .select('id, status, receipt_number, period_month, amount')
        .eq('family_id', familyMember.family_id)
        .eq('contribution_type_id', masavariType.id)
        .neq('status', 'rejected')
    : { data: [] }

  // Build Masavari month ledger
  const startYear = parseInt(setting('masavari_start_year') || '2024')
  const now = new Date()
  const masavariMonths: { key: string; label: string; isoDate: string; status: 'verified'|'submitted'|'outstanding' }[] = []
  if (masavariType) {
    let d = new Date(startYear, 0, 1)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    while (d <= currentMonth) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const isoDate = `${key}-01`
      const entry = (masavariEntries ?? []).find(e => e.period_month?.startsWith(key))
      masavariMonths.push({
        key, isoDate,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        status: entry ? (entry.status === 'verified' ? 'verified' : 'submitted') : 'outstanding',
      })
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
    masavariMonths.reverse() // newest first
  }
  const outstandingMonths = masavariMonths.filter(m => m.status === 'outstanding')
  const outstandingAmt = outstandingMonths.length * (masavariType?.amount ?? 300)

  // Member's own payment history (if linked to a family)
  const { data: entries } = familyMember?.family_id
    ? await supabase
        .from('contribution_entries')
        .select('id, amount, channel, status, receipt_number, period_month, created_at, contribution_type_id')
        .eq('family_id', familyMember.family_id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // App settings already fetched above

  const familyUnit = (familyMember?.family_units as unknown as { house_name: string; house_name_ml?: string | null } | null)

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">My Subscriptions</h1>
        {familyUnit && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {familyUnit.house_name_ml && <span className="font-malayalam" lang="ml">{familyUnit.house_name_ml} / </span>}
            {familyUnit.house_name}
          </p>
        )}
      </div>

      {!familyMember && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Your profile is not yet linked to a household record. Contact the church office to link your account.
        </div>
      )}

      {/* ── Masavari running account ── */}
      {masavariType && familyMember?.family_id && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide">
                {masavariType.name_ml
                  ? <><span className="font-malayalam" lang="ml">{masavariType.name_ml}</span> — </>
                  : ''}{masavariType.name}
              </h2>
              <p className="text-xs text-muted-foreground">₹{masavariType.amount}/month · mandatory</p>
            </div>
            {outstandingAmt > 0 && (
              <div className="text-right">
                <p className="font-bold text-red-600">₹{outstandingAmt}</p>
                <p className="text-[10px] text-red-500">{outstandingMonths.length} month{outstandingMonths.length > 1 ? 's' : ''} due</p>
              </div>
            )}
          </div>

          {outstandingMonths.length > 0 && (
            <Link href={`/finance/pay?type=${masavariType.id}&month=${outstandingMonths[outstandingMonths.length-1].isoDate}`}
              className="block text-center text-sm font-semibold py-3 rounded-xl bg-brand-900 text-white hover:bg-brand-800 transition-colors mb-3">
              Pay Oldest Due — {outstandingMonths[outstandingMonths.length-1].label} (₹{masavariType.amount})
            </Link>
          )}
          {outstandingAmt === 0 && (
            <p className="text-xs text-green-600 font-semibold mb-3">✓ All months paid up to date</p>
          )}

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {masavariMonths.map(m => (
              <div key={m.key} className="flex items-center justify-between bg-white rounded-xl border px-3 py-2">
                <span className="text-sm">{m.label}</span>
                <div className="flex items-center gap-2">
                  {m.status === 'verified' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>}
                  {m.status === 'submitted' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⏳ Submitted</span>}
                  {m.status === 'outstanding' && (
                    <Link href={`/finance/pay?type=${masavariType.id}&month=${m.isoDate}`}
                      className="text-[10px] bg-brand-900 text-white px-2 py-1 rounded-lg font-semibold hover:bg-brand-800">
                      Pay ₹{masavariType.amount}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Other voluntary collections ── */}
      {(types ?? []).filter(t => t.kind !== 'subscription').length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3">Voluntary Collections</h2>
          <div className="space-y-3">
            {(types ?? []).filter(t => t.kind !== 'subscription').map(t => {
              const fund = (t.funds as unknown as { name: string; name_ml?: string | null } | null)
              return (
                <div key={t.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      {t.name_ml && <p className="font-semibold font-malayalam text-sm" lang="ml">{t.name_ml}</p>}
                      <p className="font-semibold text-sm">{t.name}</p>
                      {fund && <p className="text-xs text-muted-foreground">{fund.name_ml ?? fund.name}</p>}
                    </div>
                    <div className="text-right">
                      {t.amount && <p className="font-bold text-brand-900">₹{t.amount}</p>}
                      <p className="text-xs text-muted-foreground capitalize">{t.amount_mode}</p>
                    </div>
                  </div>
                  {t.period_end && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Window closes: {new Date(t.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {familyMember?.family_id && (
                    <Link href={`/finance/pay?type=${t.id}`}
                      className="mt-2 block text-center text-xs font-semibold py-2 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors">
                      Pay Now
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Bank details for payment */}
      {(setting('church_bank_account') || setting('church_upi_id')) && (
        <section className="bg-brand-50 rounded-xl border border-brand-200 p-4 space-y-2">
          <h2 className="text-xs font-bold text-brand-900 uppercase tracking-wide">Church Payment Details</h2>
          {setting('church_bank_account') && (
            <>
              <p className="text-sm"><span className="font-medium">Bank:</span> {setting('church_bank_name')}</p>
              <p className="text-sm"><span className="font-medium">Account:</span> {setting('church_bank_account')}</p>
              <p className="text-sm"><span className="font-medium">IFSC:</span> {setting('church_bank_ifsc')}</p>
            </>
          )}
          {setting('church_upi_id') && (
            <p className="text-sm"><span className="font-medium">UPI:</span> {setting('church_upi_id')}</p>
          )}
          <p className="text-[11px] text-brand-700 mt-1">
            After paying, submit your UTR/reference number using the "Pay Now" button above.
          </p>
        </section>
      )}

      {/* Payment history */}
      {(entries ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-2">My Payment History</h2>
          <div className="space-y-2">
            {(entries ?? []).map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">₹{e.amount}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                {e.receipt_number && (
                  <p className="text-xs font-mono text-muted-foreground">{e.receipt_number}</p>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  e.status === 'verified'  ? 'bg-green-100 text-green-700' :
                  e.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{e.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
