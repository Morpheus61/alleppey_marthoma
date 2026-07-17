import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VerifyClient from './VerifyClient'

export const metadata = { title: 'Verify Payments' }

export default async function VerifyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  const { data: entries } = await supabase
    .from('contribution_entries')
    .select('id, amount, channel, utr, status, created_at, receipt_number, period_month, contribution_types(name, name_ml), family_units!family_id(house_name, house_name_ml)')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Verify Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{(entries ?? []).length} submission{(entries ?? []).length !== 1 ? 's' : ''} pending</p>
      </div>
      <VerifyClient entries={(entries ?? []) as unknown as Parameters<typeof VerifyClient>[0]['entries']} />
    </div>
  )
}
