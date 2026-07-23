import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { todayIST } from '@/lib/dates'
import GroupEventCard from '@/components/ui/GroupEventCard'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('groups')
    .select('name')
    .eq('slug', slug)
    .single()
  return { title: data?.name ?? 'Group' }
}

export default async function GroupPublicPage({ params }: Props) {
  const { slug } = await params
  const t = await getTranslations('groups')
  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('slug', slug)
    .eq('is_archived', false)
    .single()

  if (!group) notFound()

  // Fetch leaders
  const { data: leaders } = await supabase
    .from('group_memberships')
    .select('user_id, profiles(full_name, full_name_ml, avatar_url)')
    .eq('group_id', group.id)
    .eq('role', 'leader')
    .eq('status', 'active')

  // Fetch upcoming public events
  // Upcoming approved events for this group — public visibility only (public page)
  const { data: events } = await supabase
    .from('events')
    .select('id, title, title_ml, starts_at, venue, is_festival')
    .eq('group_id', group.id)
    .eq('approval_status', 'approved')
    .eq('visibility', 'public')
    .gte('starts_at', todayIST())
    .order('starts_at')
    .limit(8)

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      {group.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.cover_image_url}
          alt={group.name}
          className="w-full h-48 object-cover rounded-xl mb-6"
        />
      )}
      <h1 className="text-2xl font-bold text-brand-900">{group.name}</h1>
      {group.name_ml && (
        <p className="text-lg font-malayalam text-muted-foreground" lang="ml">
          {group.name_ml}
        </p>
      )}

      {group.description && (
        <div className="mt-4 prose prose-sm max-w-none">
          <p>{group.description}</p>
        </div>
      )}

      {leaders && leaders.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('leaders')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {leaders.map((l) => {
              const profile = (l.profiles as unknown) as { full_name: string; full_name_ml?: string | null; avatar_url?: string | null } | null
              return (
                <span
                  key={l.user_id}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-900"
                >
                  {profile?.full_name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming Events
          </h2>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map(ev => (
                <GroupEventCard key={ev.id} ev={ev as import('@/components/ui/GroupEventCard').GroupEventItem} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
          )}
        </div>
    </main>
  )
}
