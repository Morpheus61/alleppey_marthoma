'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setLanguage(lang: 'en' | 'ml'): Promise<void> {
  const cookieStore = await cookies()

  // Persist choice in cookie (read by next-intl/request.ts)
  cookieStore.set('ui_language', lang, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  // Mark that the user has explicitly made a language choice
  cookieStore.set('lang_picked', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Persist to profile so the preference survives cookie clears
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ ui_language: lang }).eq('id', user.id)
    }
  } catch {
    // Non-fatal — cookie is the source of truth for the current session
  }

  redirect('/')
}
