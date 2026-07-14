'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function SignOutButton() {
  const t = useTranslations('auth')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="text-sm text-muted-foreground hover:text-destructive transition-colors py-2 min-h-[44px]"
    >
      {t('signOut')}
    </button>
  )
}
