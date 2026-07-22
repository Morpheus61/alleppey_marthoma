import Link from 'next/link'
import ScriptureBlock from './ScriptureBlock'
import AmenButton from './AmenButton'
import ShareButton from './ShareButton'
import type { PulpitMessage } from '@/lib/pulpit/types'
import { IST_TZ } from '@/lib/dates'

interface Props {
  message: PulpitMessage
  isAuthenticated?: boolean
}

export default function MessageCard({ message, isAuthenticated = true }: Props) {
  const dateStr = new Date(message.created_at).toLocaleDateString('en-IN', {
    timeZone: IST_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article
      className={[
        'bg-white rounded-xl border shadow-sm px-5 py-4',
        message.is_pinned ? 'border-amber-400' : 'border-amber-100',
      ].join(' ')}
    >
      {message.is_pinned && (
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">
          📌 Pinned
        </p>
      )}

      <p className="text-[11px] text-muted-foreground mb-1">{dateStr}</p>

      {message.title && (
        <h2 className="text-base font-bold text-brand-900 mb-3 leading-snug">
          {message.title}
        </h2>
      )}

      <ScriptureBlock
        reference={message.scripture_ref}
        text={message.scripture_text}
        textMl={message.scripture_text_ml}
      />

      <div className="my-3 space-y-2">
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

      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-amber-50 mt-3">
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
          authorName={(message.author as { full_name: string } | null | undefined)?.full_name}
          dateStr={dateStr}
        />
        <Link
          href={`/pulpit/${message.id}`}
          className="ml-auto text-xs font-semibold text-brand-900 hover:underline underline-offset-2"
        >
          Read in full →
        </Link>
      </div>
    </article>
  )
}
