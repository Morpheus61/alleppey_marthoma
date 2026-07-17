import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CollectionsClient from './CollectionsClient'

export const metadata = { title: 'Manage Collections' }

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id)
    .in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')

  const { data: collections } = await supabase
    .from('contribution_types')
    .select('id, name, name_ml, kind, amount_mode, amount, period_start, period_end, is_active, funds(id, name, name_ml)')
    .order('is_active', { ascending: false })
    .order('name')

  const { data: funds } = await supabase
    .from('funds')
    .select('id, name, name_ml')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <a href="/admin/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Finance Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Manage Collections</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create, edit, and archive collection types</p>
      </div>
      <CollectionsClient
        collections={(collections ?? []) as unknown as Parameters<typeof CollectionsClient>[0]['collections']}
        funds={(funds ?? []) as Parameters<typeof CollectionsClient>[0]['funds']}
      />
    </div>
  )
}
