import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegistrySearch from './RegistrySearch'

export const metadata = { title: 'Parish Registry' }

export default async function RegistryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!profileData?.is_admin && !roleRow) redirect('/admin')

  const { data: families } = await supabase
    .from('family_units')
    .select('id, house_name, house_name_ml, address, prayer_group_id, groups!prayer_group_id(name, name_ml)')
    .order('house_name')

  const { data: memberCounts } = await supabase
    .from('family_members')
    .select('family_id')

  const countByFamily = (memberCounts ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.family_id] = (acc[row.family_id] ?? 0) + 1
    return acc
  }, {})

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, name_ml, group_type')
    .eq('is_archived', false)
    .order('group_type').order('name')

  const allGroups = (groups ?? []) as { id: string; name: string; name_ml: string | null; group_type: string }[]
  const prayerGroups = allGroups.filter(g => g.group_type === 'prayer').length > 0
    ? allGroups.filter(g => g.group_type === 'prayer')
    : allGroups

  const households = (families ?? []).map(f => ({
    id: f.id,
    house_name: f.house_name,
    house_name_ml: f.house_name_ml ?? null,
    address: f.address ?? null,
    prayer_group_id: f.prayer_group_id,
    groups: (f.groups as unknown as { name: string; name_ml: string | null } | null),
    memberCount: countByFamily[f.id] ?? 0,
  }))

  return (
    <div className="max-w-lg md:max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Parish Registry</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {households.length} household{households.length !== 1 ? 's' : ''} · Search to find, or type a new name to create
        </p>
      </div>
      <RegistrySearch households={households} prayerGroups={prayerGroups} />
    </div>
  )
}
