import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Profile, GroupMembership, Group } from '@/types/database'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData as Profile | null

  if (!profile) redirect('/auth/login')

  const { data: membershipData } = await supabase
    .from('group_memberships')
    .select('role, status, groups(id, slug, name, name_ml)')
    .eq('user_id', user.id)
    .eq('status', 'active')
  const memberships = membershipData as (Pick<GroupMembership,'role'|'status'> & { groups: Pick<Group,'id'|'slug'|'name'|'name_ml'> | null })[] | null

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">{t('title')}</h1>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3 mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
          <p className="font-semibold">{profile.full_name}</p>
          {profile.full_name_ml && (
            <p className="text-sm font-malayalam" lang="ml">{profile.full_name_ml}</p>
          )}
        </div>
        {profile.house_name && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">House</p>
            <p>{profile.house_name}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
          <p>{profile.phone}</p>
        </div>
      </div>

      {/* My groups */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t('myGroups')}
        </h2>
        {memberships && memberships.length > 0 ? (
          <ul className="space-y-2">
            {memberships.map((m) => {
              const group = m.groups as { id: string; slug: string; name: string; name_ml?: string | null } | null
              if (!group) return null
              return (
                <li key={group.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <span className="font-medium">{group.name}</span>
                  {m.role === 'leader' && (
                    <span className="text-xs bg-brand-100 text-brand-900 px-2 py-0.5 rounded-full font-medium">
                      Leader
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noGroups')}</p>
        )}
      </div>
    </main>
  )
}
