import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  // Default to English; fall back gracefully during static generation
  // when there is no request context (e.g. /_not-found prerender)
  let locale: 'en' | 'ml' = 'en'
  try {
    const cookieStore = await cookies()
    const val = cookieStore.get('ui_language')?.value
    if (val === 'ml') locale = 'ml'
  } catch {
    // No request context — use default locale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
