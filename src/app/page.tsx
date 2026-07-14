import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default async function HomePage() {
  const t = await getTranslations('home')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check profile status
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profileData as Profile | null

  if (!p) redirect('/auth/pending')
  if (p.status === 'pending') redirect('/auth/pending')
  if (p.status !== 'active') redirect('/auth/disabled')

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-brand-900">
          {t('welcome', { name: p.full_name })}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>

        {/* TODO: Stage 3 — full home page with calendar + announcements + group directory */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/groups"
            className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{t('groups')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('groupsDesc')}</p>
          </Link>
          <Link
            href="/calendar"
            className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{t('calendar')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('calendarDesc')}</p>
          </Link>
          <Link
            href="/me"
            className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{t('profile')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('profileDesc')}</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
