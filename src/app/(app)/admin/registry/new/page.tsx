import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewHouseholdForm from '../NewHouseholdForm'

export const metadata = { title: 'New Household' }

export default async function NewHouseholdPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!profileData?.is_admin && !roleRow) redirect('/admin')

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, name_ml, group_type')
    .eq('is_archived', false)
    .order('group_type').order('name')

  const prayerGroups = (groups ?? []).filter(g => g.group_type === 'prayer')
  const allGroups = groups ?? []

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/admin/registry" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Back to Registry</Link>
        <h1 className="text-2xl font-bold text-brand-900">Add Household</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Creates a new family unit in the parish registry.</p>
      </div>
      <NewHouseholdForm prayerGroups={prayerGroups.length > 0 ? prayerGroups : allGroups} />
    </div>
  )
}
