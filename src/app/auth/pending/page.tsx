import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/auth/SignOutButton'
import type { Profile } from '@/types/database'

export default async function PendingPage() {
  const t = await getTranslations('auth')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = data as Profile | null

  if (profile?.status === 'active') redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <span className="text-amber-600 text-2xl">⏳</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{t('pendingTitle')}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('pendingMessage')}
          </p>
          <p className="text-muted-foreground text-sm font-malayalam" lang="ml">
            {t('pendingMessageMl')}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          {t('pendingContact')}
        </div>
        <SignOutButton />
      </div>
    </div>
  )
}
