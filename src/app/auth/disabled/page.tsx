import { getTranslations } from 'next-intl/server'
import SignOutButton from '@/components/auth/SignOutButton'

export default async function DisabledPage() {
  const t = await getTranslations('auth')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-600 text-2xl">🚫</span>
        </div>
        <h1 className="text-xl font-bold">{t('disabledTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('disabledMessage')}</p>
        <SignOutButton />
      </div>
    </div>
  )
}
