import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

export const metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const t = await getTranslations('events')
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, title_ml, starts_at, ends_at, venue, group_id, groups(name, name_ml)')
    .eq('visibility', 'public')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(30)

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">{t('title')}</h1>
      <div className="space-y-3">
        {events?.map((event) => {
          const group = (event.groups as unknown) as { name: string; name_ml?: string | null } | null
          return (
            <article key={event.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold">{event.title}</h2>
                  {event.title_ml && (
                    <p className="text-sm font-malayalam text-muted-foreground" lang="ml">
                      {event.title_ml}
                    </p>
                  )}
                  {event.venue && (
                    <p className="text-sm text-muted-foreground mt-1">
                      📍 {event.venue}
                    </p>
                  )}
                  {group && (
                    <p className="text-xs text-muted-foreground mt-1">{group.name}</p>
                  )}
                </div>
                <div className="text-right text-sm shrink-0">
                  <p className="font-medium">
                    {new Date(event.starts_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(event.starts_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
        {(!events || events.length === 0) && (
          <p className="text-center text-muted-foreground py-12">{t('noEvents')}</p>
        )}
      </div>
    </main>
  )
}
