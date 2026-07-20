'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import AmenButton from './AmenButton'
import ScriptureBlock from './ScriptureBlock'
import type { PulpitMessage } from '@/lib/pulpit/types'
import { IST_TZ } from '@/lib/dates'

export default function HomePulpitCard({ message }: { message: PulpitMessage }) {
  const [expanded, setExpanded] = useState(false)

  const dateStr = new Date(message.created_at).toLocaleDateString('en-IN', {
    timeZone: IST_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const snippet = message.body.slice(0, 80)

  return (
    <div className="mb-5">
      {/* Section label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          The Pulpit ·{' '}
          <span className="font-malayalam normal-case tracking-normal" lang="ml">
            ഇടയ സന്ദേശം
          </span>
        </span>
        <Link
          href="/pulpit"
          className="text-[11px] text-brand-900 font-medium hover:underline underline-offset-2"
          onClick={e => e.stopPropagation()}
        >
          See all →
        </Link>
      </div>

      {/* Card */}
      <div
        role="button"
        aria-expanded={expanded}
        className={[
          'bg-white border rounded-xl overflow-hidden cursor-pointer transition-colors duration-200',
          expanded ? 'border-amber-400' : 'border-amber-100 hover:border-amber-300',
        ].join(' ')}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Collapsed row — always visible */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center text-base shrink-0 leading-none">
            🕊️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 mb-0.5">{dateStr}</p>
            <p className="text-[13px] font-semibold text-brand-900 truncate">
              {message.title || 'Message from the Vicar'}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{snippet}…</p>
          </div>
          <ChevronDown
            size={16}
            className={[
              'text-gray-400 shrink-0 transition-transform duration-300',
              expanded ? 'rotate-180' : '',
            ].join(' ')}
          />
        </div>

        {/* Expandable body */}
        <div
          style={{
            maxHeight: expanded ? '800px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div className="border-t border-amber-100">
            {/* Header image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pulpit_card.png"
              alt="The Pulpit"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                display: 'block',
                maxHeight: '140px',
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />

            <div className="px-4 pb-4 pt-3">
              <ScriptureBlock
                reference={message.scripture_ref}
                text={message.scripture_text}
                textMl={message.scripture_text_ml}
              />

              <div className="my-3 space-y-2">
                {message.body_ml && (
                  <p
                    className="font-malayalam text-sm leading-[1.9] text-brand-900"
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

              <div
                className="flex items-center justify-between pt-3 border-t border-amber-50 mt-3"
                onClick={e => e.stopPropagation()}
              >
                <AmenButton
                  messageId={message.id}
                  initialCount={message.amen_count ?? 0}
                  initialAmened={message.user_has_amened ?? false}
                />
                <Link
                  href={`/pulpit/${message.id}`}
                  className="text-xs font-semibold text-brand-900 hover:underline underline-offset-2"
                >
                  Read in full →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
