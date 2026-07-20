import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ScriptureBlock from '@/components/pulpit/ScriptureBlock'
import AmenButton from '@/components/pulpit/AmenButton'
import ShareButton from '@/components/pulpit/ShareButton'
import type { PulpitMessage } from '@/lib/pulpit/types'
import { IST_TZ } from '@/lib/dates'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('pulpit_messages')
    .select('title, body, scripture_ref')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'The Pulpit' }

  return {
    title: data.title ?? 'Message from the Vicar',
    description: data.body?.slice(0, 150) ?? undefined,
    openGraph: {
      title: data.title ?? 'Message from the Vicar',
      description: [
        data.body?.slice(0, 120),
        data.scripture_ref ? `📖 ${data.scripture_ref}` : null,
        'St. George Marthoma Syrian Church, Alappuzha',
      ].filter(Boolean).join(' · ') ?? undefined,
      images: ['/pulpit-banner.png'],
    },
  }
}

export default async function PulpitMessagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // No auth required — public read
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  const { data } = await supabase
    .from('pulpit_messages')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!data) notFound()

  // Amen count — public; user amen — members only
  const [{ data: allAmens }, { data: userAmen }] = await Promise.all([
    supabase.from('pulpit_amens').select('user_id').eq('message_id', id),
    user
      ? supabase.from('pulpit_amens').select('user_id')
          .eq('message_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const message: PulpitMessage = {
    ...(data as PulpitMessage),
    amen_count: allAmens?.length ?? 0,
    user_has_amened: !!userAmen,
  }

  const dateStr = new Date(message.created_at).toLocaleDateString('en-IN', {
    timeZone: IST_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Breadcrumb */}
      <Link
        href="/pulpit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ← The Pulpit
      </Link>

      {message.is_pinned && (
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
          📌 Pinned
        </p>
      )}

      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">{dateStr}</p>
        {message.title && (
          <h1 className="text-xl font-bold text-brand-900 leading-snug">{message.title}</h1>
        )}
      </div>

      <ScriptureBlock
        reference={message.scripture_ref}
        text={message.scripture_text}
        textMl={message.scripture_text_ml}
      />

      <div className="space-y-3">
        {message.body_ml && (
          <p
            className="font-malayalam text-[15px] leading-[1.9] text-brand-900"
            lang="ml"
            dir="auto"
          >
            {message.body_ml}
          </p>
        )}
        <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
          {message.body}
        </p>
      </div>

      {message.author && (
        <p className="text-xs text-muted-foreground border-t border-amber-50 pt-3">
          — {(message.author as { full_name: string }).full_name}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <AmenButton
          messageId={message.id}
          initialCount={message.amen_count ?? 0}
          initialAmened={message.user_has_amened ?? false}
          isAuthenticated={isAuthenticated}
        />
        <ShareButton
          messageId={message.id}
          title={message.title}
          scriptureRef={message.scripture_ref}
        />
      </div>

    </div>
  )
}
