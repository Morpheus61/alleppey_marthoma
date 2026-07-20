import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MessageCard from '@/components/pulpit/MessageCard'
import type { PulpitMessage } from '@/lib/pulpit/types'
import { IST_TZ } from '@/lib/dates'

export const metadata = {
  title: 'The Pulpit · ഇടയ സന്ദേശം',
  description: 'Messages from the Vicar, St. George Marthoma Syrian Church, Alappuzha',
  openGraph: {
    title: 'The Pulpit · ഇടയ സന്ദേശം',
    description: 'Messages from the Vicar, St. George Marthoma Syrian Church, Alappuzha',
    title: 'The Pulpit · ഇടയ സന്ദേശം',
    description: 'Messages from the Vicar, St. George Marthoma Syrian Church, Alappuzha',
    images: ['/pulpit_card.png'],
  },
}

export default async function PulpitPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  // Guests and members both reach this page — do NOT redirect
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Determine admin status (drafts tab + New Message button)
  let isAdmin = false
  if (user) {
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
      supabase.from('parish_roles').select('id')
        .eq('profile_id', user.id)
        .in('role', ['admin', 'super_admin'])
        .is('revoked_at', null)
        .maybeSingle(),
    ])
    isAdmin = !!(profile?.is_admin || roleRow)
  }

  const params = await searchParams
  const tab = params.tab === 'drafts' && isAdmin ? 'drafts' : 'published'

  const { data: messagesRaw } = await supabase
    .from('pulpit_messages')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('is_published', tab === 'published')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  const messages = (messagesRaw ?? []) as PulpitMessage[]
  const messageIds = messages.map(m => m.id)

  // Amen counts — public; user amens — members only
  const [{ data: allAmens }, { data: userAmens }] = await Promise.all([
    messageIds.length
      ? supabase.from('pulpit_amens').select('message_id').in('message_id', messageIds)
      : Promise.resolve({ data: [] as { message_id: string }[] }),
    messageIds.length && user
      ? supabase.from('pulpit_amens').select('message_id')
          .in('message_id', messageIds)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] as { message_id: string }[] }),
  ])

  const amenCountMap = new Map<string, number>()
  for (const a of allAmens ?? []) {
    amenCountMap.set(a.message_id, (amenCountMap.get(a.message_id) ?? 0) + 1)
  }
  const userAmenSet = new Set((userAmens ?? []).map(a => a.message_id))

  const enriched: PulpitMessage[] = messages.map(m => ({
    ...m,
    amen_count: amenCountMap.get(m.id) ?? 0,
    user_has_amened: userAmenSet.has(m.id),
  }))

  // Group by month label
  const grouped = new Map<string, PulpitMessage[]>()
  for (const m of enriched) {
    const key = new Date(m.created_at).toLocaleDateString('en-IN', {
      timeZone: IST_TZ,
      month: 'long',
      year: 'numeric',
    })
    const arr = grouped.get(key) ?? []
    arr.push(m)
    grouped.set(key, arr)
  }

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Hero banner */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pulpit_card.png"
        alt="The Pulpit — ഇടയ സന്ദേശം, Messages from the Pulpit"
        className="w-full rounded-xl block shadow-sm"
      />

      {/* Admin controls */}
      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/pulpit"
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'published'
                ? 'bg-brand-900 text-white'
                : 'bg-white border border-amber-200 text-gray-600 hover:bg-amber-50'
            }`}
          >
            Published
          </Link>
          <Link
            href="/pulpit?tab=drafts"
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'drafts'
                ? 'bg-brand-900 text-white'
                : 'bg-white border border-amber-200 text-gray-600 hover:bg-amber-50'
            }`}
          >
            Drafts
          </Link>
          <Link
            href="/pulpit/compose"
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-900 text-white hover:bg-brand-800 transition-colors"
          >
            + New Message
          </Link>
        </div>
      )}

      {/* Empty state */}
      {enriched.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-16">
          {tab === 'drafts'
            ? 'No drafts saved.'
            : "The Vicar's first message will appear here."}
        </p>
      )}

      {/* Feed — grouped by month */}
      {[...grouped.entries()].map(([month, msgs]) => (
        <div key={month}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            {month}
          </p>
          <div className="space-y-4">
            {msgs.map(m => (
              <MessageCard key={m.id} message={m} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}
