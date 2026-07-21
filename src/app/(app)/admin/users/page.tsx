import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UsersClient from './UsersClient'
import type { ProfileRow, RegistryLink } from './types'

export const metadata = { title: 'App Users — Admin' }

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin', 'super_admin']).is('revoked_at', null).maybeSingle()
  if (!profileData?.is_admin && !roleRow) redirect('/admin')

  const [{ data: profilesRaw }, { data: prayerGroupsRaw }, { data: linkedMembersRaw }] = await Promise.all([
    supabase
      .from('profiles')
      // POST-016: after Stage B drops full_name, read display_name only; for now select both
      .select('id, display_name, full_name, full_name_ml, phone, created_at, status, claim_status, family_member_id, date_of_birth, address, house_name, email, family_members')
      .order('created_at', { ascending: false }),
    supabase
      .from('groups')
      .select('id, name, name_ml')
      .eq('group_type', 'prayer')
      .eq('is_archived', false)
      .order('name'),
    supabase
      .from('family_members')
      .select('id, full_name, family_id, profile_id, family_units!family_id(house_name)')
      .not('profile_id', 'is', null),
  ])

  // Build a map from profile_id → registry link info for pending_claim / approved profiles
  const registryMap: Record<string, RegistryLink> = {}
  for (const fm of (linkedMembersRaw ?? [])) {
    const fu = (fm as unknown as { family_units: { house_name: string } | null }).family_units
    if (fm.profile_id) {
      registryMap[fm.profile_id] = {
        memberName: fm.full_name,
        houseName:  fu?.house_name ?? '—',
        familyId:   fm.family_id,
      }
    }
  }

  const profiles    = (profilesRaw    ?? []) as unknown as ProfileRow[]
  const prayerGroups = (prayerGroupsRaw ?? []) as { id: string; name: string; name_ml: string | null }[]
  const unclaimedCount = profiles.filter(p => p.claim_status === 'unclaimed').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground mb-2 block">← Admin</Link>
          <h1 className="text-2xl font-bold text-brand-900">App Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {profiles.length} registered account{profiles.length !== 1 ? 's' : ''}
            {unclaimedCount > 0 && (
              <span className="ml-2 inline-block bg-amber-100 text-amber-800 font-semibold text-[11px] px-2 py-0.5 rounded-full">
                {unclaimedCount} need{unclaimedCount === 1 ? 's' : ''} linking
              </span>
            )}
          </p>
        </div>
      </div>
      <UsersClient profiles={profiles} registryMap={registryMap} prayerGroups={prayerGroups} />
    </div>
  )
}
