import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient'
import { todayIST, startOfMonthIST, endOfMonthIST } from '@/lib/dates'

export const metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch 7-month window (1 prev + current + 6 ahead) — all in IST
  const windowStart = startOfMonthIST(-1)
  const windowEnd   = endOfMonthIST(6)

  const { data: events } = await supabase
    .from('events')
    .select('id, title, title_ml, starts_at, ends_at, venue, visibility, group_id, is_festival, created_by, groups(name, name_ml, group_type)')
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())
    .order('starts_at')
    .limit(200)

  const { data: templates } = await supabase
    .from('event_templates')
    .select('id, name, name_ml, group_type_hint, default_time, default_venue, default_visibility, default_reminder_minutes, recurrence_suggestion, requires_host_family, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  // Prayer groups + all family units (for Prayer Meeting host-family picker)
  const { data: prayerGroups } = await supabase
    .from('groups')
    .select('id, name, name_ml')
    .eq('group_type', 'prayer')
    .eq('is_archived', false)
    .order('name')

  const { data: familyUnits } = await supabase
    .from('family_units')
    .select('id, house_name, house_name_ml, prayer_group_id')
    .order('house_name')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  const isAdmin = !!(profileData?.is_admin || roleRow)
  const serverDate = todayIST()  // 'YYYY-MM-DD' in IST, stable for hydration

  return (
    <CalendarClient
      events={(events ?? []) as unknown as Parameters<typeof CalendarClient>[0]['events']}
      templates={templates ?? []}
      prayerGroups={prayerGroups ?? []}
      familyUnits={(familyUnits ?? []) as Parameters<typeof CalendarClient>[0]['familyUnits']}
      isAdmin={isAdmin}
      currentUserId={user.id}
      serverDate={serverDate}
    />
  )
}
