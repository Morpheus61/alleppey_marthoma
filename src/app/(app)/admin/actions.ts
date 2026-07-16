'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/')
  return supabase
}

/* ── Members ──────────────────────────────────── */

export async function approveProfile(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('profiles').update({ status: 'active' }).eq('id', id)
  revalidatePath('/admin')
}

export async function declineProfile(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('profiles').update({ status: 'disabled' }).eq('id', id)
  revalidatePath('/admin')
}

export async function toggleAdmin(id: string, makeAdmin: boolean) {
  const supabase = await requireAdmin()
  await supabase.from('profiles').update({ is_admin: makeAdmin }).eq('id', id)
  revalidatePath('/admin')
}

/* ── Groups ───────────────────────────────────── */

export async function createGroup(formData: FormData) {
  const supabase = await requireAdmin()
  const name    = (formData.get('name')    as string).trim()
  const name_ml = (formData.get('name_ml') as string | null)?.trim() || null
  const desc    = (formData.get('description') as string | null)?.trim() || null
  const type    = (formData.get('group_type') as 'functional' | 'prayer' | 'youth') || 'functional'
  const slug    = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  await supabase.from('groups').insert({
    name, name_ml, description: desc, slug, group_type: type, is_archived: false,
  })
  revalidatePath('/admin')
  revalidatePath('/groups')
}

export async function archiveGroup(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('groups').update({ is_archived: true }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/groups')
}

export async function unarchiveGroup(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('groups').update({ is_archived: false }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/groups')
}

/* ── Announcements ────────────────────────────── */

export async function postAnnouncement(formData: FormData) {
  const supabase = await requireAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const title      = (formData.get('title')    as string | null)?.trim() || null
  const title_ml   = (formData.get('title_ml') as string | null)?.trim() || null
  const bodyEn     = (formData.get('body')      as string)?.trim()
  const body_ml    = (formData.get('body_ml')  as string | null)?.trim() || null
  const body       = bodyEn || body_ml || ''   // ML-only posts are valid
  const visibility = (formData.get('visibility') as 'members' | 'public') || 'members'
  const groupId    = (formData.get('group_id') as string | null) || null

  if (!body) return

  await supabase.from('posts').insert({
    author_id: user.id,
    group_id: groupId || null,
    title,
    title_ml,
    body,
    body_ml,
    visibility,
    is_pinned: false,
    is_deleted: false,
  })
  revalidatePath('/')
  revalidatePath('/groups')
}
