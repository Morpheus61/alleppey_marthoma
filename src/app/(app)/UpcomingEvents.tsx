'use client'
// Renders upcoming events with times forced to IST (Asia/Kolkata)
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { IST_TZ } from '@/lib/dates'

interface Event {
  id: string
  title: string
  starts_at: string
  venue: string | null
}

export default function UpcomingEvents({ events }: { events: Event[] }) {
  if (!events || events.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-brand-900">Upcoming Events</h2>
        <Link href="/calendar" className="text-xs text-brand-700 font-medium flex items-center gap-0.5">
          See all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="space-y-2">
        {events.map(e => {
          const dt = new Date(e.starts_at)
          const month = dt.toLocaleString('en-IN', { timeZone: IST_TZ, month: 'short' }).toUpperCase()
          const day   = dt.toLocaleString('en-IN', { timeZone: IST_TZ, day: 'numeric' })
          const time  = dt.toLocaleString('en-IN', { timeZone: IST_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
          return (
            <div key={e.id} className="flex gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
              <div className="shrink-0 bg-brand-900 text-white rounded-lg w-11 h-11 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-bold uppercase leading-none">{month}</p>
                <p className="text-lg font-bold leading-none">{day}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {time}{e.venue ? ` · ${e.venue}` : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
