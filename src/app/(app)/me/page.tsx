import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, GroupMembership, Group } from '@/types/database'
import ProfileCard from '@/components/directory/ProfileCard'
import { updateMyProfile, updateMyPhoto } from './actions'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile) redirect('/auth/login')

  const { data: membershipData } = await supabase
    .from('group_memberships')
    .select('role, status, groups(id, slug, name, name_ml, group_type)')
    .eq('user_id', user.id)
    .eq('status', 'active')
  const memberships = membershipData as (Pick<GroupMembership,'role'|'status'> & { groups: Pick<Group,'id'|'slug'|'name'|'name_ml'> & { group_type: string } | null })[] | null

  // Authoritative prayer group from family_unit assignment (not group_memberships)
  const { data: prayerGroupData } = await supabase
    .from('family_members')
    .select('family_units!family_id(groups!prayer_group_id(id, name, name_ml))')
    .eq('profile_id', user.id)
    .eq('is_deceased', false)
    .limit(1)
    .maybeSingle()
  const prayerGroup = (prayerGroupData as unknown as { family_units: { groups: { id: string; name: string; name_ml: string | null } | null } | null } | null)
    ?.family_units?.groups ?? null

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-6">

      <h1 className="text-2xl font-bold text-brand-900">My Profile</h1>

      {/* Bhagam / Prayer Group — authoritative source: family_unit assignment */}
      <section>
        <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">My Bhagam (Prayer Group)</h2>
        {prayerGroup ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <p className="font-semibold text-sm text-brand-900">{prayerGroup.name}</p>
            {prayerGroup.name_ml && (
              <p className="text-xs text-muted-foreground font-malayalam" lang="ml">{prayerGroup.name_ml}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No Bhagam assigned yet. Contact the Admin.</p>
        )}
      </section>

      {/* Other group memberships (excluding prayer groups — those are shown above) */}
      {memberships && memberships.filter(m => m.groups && (m.groups as { group_type: string }).group_type !== 'prayer').length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">My Groups</h2>
          <div className="space-y-2">
            {memberships
              .filter(m => m.groups && (m.groups as { group_type: string }).group_type !== 'prayer')
              .map(m => {
                const group = m.groups as { id: string; slug: string; name: string; name_ml?: string | null } | null
                if (!group) return null
                return (
                  <Link key={group.id} href={`/groups/${group.slug}/feed`}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-sm">{group.name}</p>
                      {group.name_ml && <p className="text-xs text-muted-foreground font-malayalam" lang="ml">{group.name_ml}</p>}
                    </div>
                    {m.role === 'leader' && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Leader</span>
                    )}
                  </Link>
                )
              })}
          </div>
        </section>
      )}

      {/* Profile — view mode by default; Edit button reveals form */}
      <ProfileCard
        profile={profile}
        action={updateMyProfile}
        onPhotoUpload={updateMyPhoto}
      />

    </div>
  )
}
