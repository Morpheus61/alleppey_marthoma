'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/calendar')
  return { supabase, userId: user.id, isSuperAdmin: r?.role === 'super_admin' }
}

/**
 * For event creation: admin/super_admin may create any event.
 * Convenors may create events for their own group only.
 * Returns the caller context including approval routing.
 */
async function requireCreateAccess(groupId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  const isAdmin = !!(p?.is_admin || r)
  const isSuperAdmin = r?.role === 'super_admin'

  if (isAdmin) return { supabase, userId: user.id, isSuperAdmin, isConvenor: false }

  // Convenor path: check if caller is convenor for this group
  // DB canonical value is 'leader'; UI displays it as Convenor (കൺവീനർ)
  if (groupId) {
    const { data: conv } = await supabase.from('group_memberships')
      .select('id').eq('group_id', groupId).eq('user_id', user.id).eq('role', 'leader').eq('status', 'active').maybeSingle()
    if (conv) return { supabase, userId: user.id, isSuperAdmin: false, isConvenor: true }
  }
  redirect('/calendar')
}

/**
 * For event edits: admin/super_admin may edit any event.
 * Convenors may edit events for their own group.
 */
async function requireEventEditAccess(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  const isAdmin = !!(p?.is_admin || r)
  const isSuperAdmin = r?.role === 'super_admin'

  if (isAdmin) return { supabase, userId: user.id, isSuperAdmin }

  // Convenor check: fetch event's group_id then verify membership
  // DB canonical value is 'leader'; UI displays it as Convenor (കൺവീനർ)
  const { data: ev } = await supabase.from('events').select('group_id').eq('id', eventId).single()
  if (ev?.group_id) {
    const { data: conv } = await supabase.from('group_memberships')
      .select('id').eq('group_id', ev.group_id).eq('user_id', user.id).eq('role', 'leader').eq('status', 'active').maybeSingle()
    if (conv) return { supabase, userId: user.id, isSuperAdmin: false }
  }
  redirect('/calendar')
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData): Promise<{ error: string } | { id: string }> {
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

  const ctx = await requireCreateAccess(groupId)
  const { supabase, userId, isSuperAdmin, isConvenor } = ctx

  // Approval routing:
  // - Vicar (super_admin) → approved directly
  // - Convenor (own group) → approved directly
  // - Secretary (admin) → pending, awaits Vicar approval
  const approvalStatus = (isSuperAdmin || isConvenor) ? 'approved' : 'pending'

  const { data, error } = await supabase
    .from('events')
    .insert({
      title, title_ml: titleMl, starts_at: startsAt,
      ends_at: endsAt || null, venue, visibility,
      group_id: groupId || null,
      is_festival: isFestival,
      rrule, reminder_minutes: reminderMin,
      created_by: userId,
      approval_status: approvalStatus,
    })
    .select('id').single()

  // Backfill host_family_id separately — avoids schema cache errors on fresh deployments
  if (!error && data?.id && hostFamilyId) {
    await supabase.from('events').update({ host_family_id: hostFamilyId }).eq('id', data.id)
  }

  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { id: data.id }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteEvent(id: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/calendar')
  return { success: true }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEvent(formData: FormData): Promise<{ error: string } | { success: true }> {
  const id = (formData.get('id') as string).trim()
  if (!id) return { error: 'Event ID is required' }

  const { supabase, userId, isSuperAdmin } = await requireEventEditAccess(id)

  const title       = (formData.get('title') as string).trim()
  const titleMl     = (formData.get('title_ml') as string | null)?.trim() || null
  const startsAt    = formData.get('starts_at') as string
  const endsAt      = (formData.get('ends_at') as string | null) || null
  const venue       = (formData.get('venue') as string | null)?.trim() || null
  const visibility  = (formData.get('visibility') as string) || 'public'
  const isFestival  = formData.get('is_festival') === 'true'
  const reminderMin = parseInt(formData.get('reminder_minutes') as string) || 1440

  if (!title) return { error: 'Title is required' }
  if (!startsAt) return { error: 'Date/time is required' }

  // Fetch current state for audit + approval_status preservation
  const { data: existing } = await supabase
    .from('events')
    .select('approval_status, title, title_ml, starts_at, ends_at, venue, visibility')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('events')
    .update({
      title, title_ml: titleMl, starts_at: startsAt, ends_at: endsAt || null,
      venue, visibility, is_festival: isFestival, reminder_minutes: reminderMin,
      // approval_status intentionally NOT changed — secretary edits stay 'approved'
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Audit-log edits to already-approved events (Vicar visibility, no gate)
  if (existing?.approval_status === 'approved' && !isSuperAdmin) {
    await supabase.from('event_edit_log').insert({
      event_id: id,
      actor_id: userId,
      before_data: {
        title:    existing.title,
        title_ml: existing.title_ml,
        starts_at: existing.starts_at,
        ends_at:  existing.ends_at,
        venue:    existing.venue,
      },
      after_data: { title, title_ml: titleMl, starts_at: startsAt, ends_at: endsAt || null, venue },
    })
  }

  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true }
}

// ── Approve (Vicar only) ──────────────────────────────────────────────────────

export async function approveEvent(id: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: r } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).eq('role', 'super_admin').is('revoked_at', null).maybeSingle()
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!r && !p?.is_admin) return { error: 'Only the Vicar can approve events.' }

  // Fetch event title for audit log
  const { data: ev } = await supabase.from('events').select('title').eq('id', id).single()

  const { error } = await supabase
    .from('events')
    .update({ approval_status: 'approved', rejection_reason: null })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id:     user.id,
    action:       'event.approve',
    target_table: 'events',
    target_id:    id,
    details:      { title: ev?.title },
  })

  revalidatePath('/calendar')
  return { success: true }
}

// ── Reject (Vicar only) ───────────────────────────────────────────────────────

export async function rejectEvent(id: string, reason?: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: r } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).eq('role', 'super_admin').is('revoked_at', null).maybeSingle()
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!r && !p?.is_admin) return { error: 'Only the Vicar can reject events.' }

  // Fetch event title for audit log
  const { data: ev } = await supabase.from('events').select('title').eq('id', id).single()

  const trimmedReason = reason?.trim() || null

  const { error } = await supabase
    .from('events')
    .update({ approval_status: 'rejected', rejection_reason: trimmedReason })
    .eq('id', id)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id:     user.id,
    action:       'event.reject',
    target_table: 'events',
    target_id:    id,
    details:      { title: ev?.title, reason: trimmedReason },
  })

  revalidatePath('/calendar')
  return { success: true }
}
