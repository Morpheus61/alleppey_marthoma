// Compact event card — reused on group pages and wherever a read-only
// upcoming-events list is needed. Matches the card pattern in CalendarClient.
import { IST_TZ } from '@/lib/dates'

export interface GroupEventItem {
  id: string
  title: string
  title_ml: string | null
  starts_at: string
  venue: string | null
  is_festival: boolean
}

export default function GroupEventCard({ ev }: { ev: GroupEventItem }) {
  const dotClass = ev.is_festival ? 'bg-amber-400' : 'bg-brand-900'
  const cardClass = 'rounded-xl border px-4 py-3 shadow-sm flex gap-3 items-start ' +
    (ev.is_festival ? 'bg-amber-50 border-amber-200' : 'bg-white')

  const dispDate = new Date(ev.starts_at).toLocaleDateString('en-IN', {
    timeZone: IST_TZ, weekday: 'short', day: 'numeric', month: 'short',
  })
  const dispTime = new Date(ev.starts_at).toLocaleTimeString('en-IN', {
    timeZone: IST_TZ, hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={cardClass}>
      <span className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + dotClass} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{ev.title}</p>
        {ev.title_ml && (
          <p className="text-xs font-malayalam text-muted-foreground" lang="ml">
            {ev.title_ml}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {dispDate}
          {' \u00b7 '}
          {dispTime}
          {ev.venue ? ' \u00b7 ' + ev.venue : ''}
        </p>
      </div>
    </div>
  )
}
