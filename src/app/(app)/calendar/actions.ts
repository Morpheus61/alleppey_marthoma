'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/calendar')
  return { supabase, userId: user.id }
}

export async function createEvent(formData: FormData): Promise<{ error: string } | { id: string }> {
  const { supabase, userId } = await requireAdmin()

  const title          = (formData.get('title') as string).trim()
  const titleMl        = (formData.get('title_ml') as string | null)?.trim() || null
  const startsAt       = formData.get('starts_at') as string
  const endsAt         = (formData.get('ends_at') as string | null) || null
  const venue          = (formData.get('venue') as string | null)?.trim() || null
  const visibility     = (formData.get('visibility') as string) || 'public'
  const groupId        = (formData.get('group_id') as string | null) || null
  const hostFamilyId   = (formData.get('host_family_id') as string | null) || null
  const isFestival     = formData.get('is_festival') === 'true'
  const rrule          = (formData.get('rrule') as string | null)?.trim() || null
  const reminderMin    = parseInt(formData.get('reminder_minutes') as string) || 1440

  if (!title) return { error: 'Title is required' }
  if (!startsAt) return { error: 'Date/time is required' }

  const { data, error } = await supabase
    .from('events')
    .insert({
      title, title_ml: titleMl, starts_at: startsAt,
      ends_at: endsAt || null, venue, visibility,
      group_id: groupId || null,
      host_family_id: hostFamilyId || null,
      is_festival: isFestival,
      rrule, reminder_minutes: reminderMin,
      created_by: userId,
    })
    .select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { id: data.id }
}

export async function deleteEvent(id: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { success: true }
}
