import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Group, GroupMembership, Profile } from '@/types/database'

interface Props { params: { slug: string } }

export default async function ManagePage({ params }: Props) {
  const t = await getTranslations('manage')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: groupData } = await supabase
    .from('groups')
    .select('id, name, name_ml')
    .eq('slug', params.slug)
    .single()
  const group = groupData as Pick<Group,'id'|'name'|'name_ml'> | null
  if (!group) notFound()

  // Must be leader of this group or admin
  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const profile = profileData as Pick<Profile,'is_admin'> | null

  const { data: membershipData } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()
  const membership = membershipData as Pick<GroupMembership,'role'> | null

  const isLeader = membership?.role === 'leader'
  const isAdmin  = profile?.is_admin ?? false

  if (!isLeader && !isAdmin) redirect('/')

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-2">
        {t('title', { group: group.name })}
      </h1>
      {group.name_ml && (
        <p className="font-malayalam text-muted-foreground mb-6" lang="ml">{group.name_ml}</p>
      )}

      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="font-medium">Leader dashboard in Stage 5</p>
        <p className="text-sm mt-1">Post composer · Event creation · Join requests · Member list</p>
      </div>
    </main>
  )
}
