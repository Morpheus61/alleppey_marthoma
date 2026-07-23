'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireLeaderOrAdmin(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!profile?.is_admin && membership?.role !== 'leader') redirect('/')
  return { supabase, user }
}

export async function postToGroup(groupId: string, formData: FormData) {
  const { supabase, user } = await requireLeaderOrAdmin(groupId)
  const title      = (formData.get('title')    as string | null)?.trim() || null
  const title_ml   = (formData.get('title_ml') as string | null)?.trim() || null
  const bodyEn     = (formData.get('body')      as string)?.trim()
  const body_ml    = (formData.get('body_ml')  as string | null)?.trim() || null
  // At least one language required; fall back to ML text if no English body
  const body       = bodyEn || body_ml || ''
  const visibility = (formData.get('visibility') as 'members' | 'public') || 'members'
  const pin        = formData.get('is_pinned') === 'on'
  if (!body) return

  await supabase.from('posts').insert({
    author_id: user.id,
    group_id: groupId,
    title,
    title_ml,
    body,
    body_ml,
    visibility,
    is_pinned: pin,
    is_deleted: false,
  })
  revalidatePath(`/groups/${groupId}/feed`)
  revalidatePath(`/manage/${groupId}`)
}

export async function approveJoinRequest(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)
  await supabase
    .from('group_memberships')
    .update({ status: 'active' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  revalidatePath(`/manage/${groupId}`)
}

export async function declineJoinRequest(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)
  await supabase
    .from('group_memberships')
    .update({ status: 'removed' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  revalidatePath(`/manage/${groupId}`)
}

export async function removeMember(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)
  await supabase
    .from('group_memberships')
    .update({ status: 'removed' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  revalidatePath(`/manage/${groupId}`)
}

export async function appointLeader(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)

  // Demote any existing leader(s) in this group back to member
  await supabase
    .from('group_memberships')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('role', 'leader')

  // Elevate the new convenor
  await supabase
    .from('group_memberships')
    .update({ role: 'leader' })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  // Persist as the authoritative convenor on the group record
  await supabase
    .from('groups')
    .update({ convenor_id: userId })
    .eq('id', groupId)

  revalidatePath(`/manage/${groupId}`)
  revalidatePath(`/groups/${groupId}`)
}

export async function revokeLeader(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)

  await supabase
    .from('group_memberships')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  // Clear convenor_id only if this person IS the current convenor
  await supabase
    .from('groups')
    .update({ convenor_id: null })
    .eq('id', groupId)
    .eq('convenor_id', userId)

  revalidatePath(`/manage/${groupId}`)
  revalidatePath(`/groups/${groupId}`)
}

/* ── Update Group Info ────────────────────────── */

export async function updateGroupInfo(groupId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = profile?.is_admin ?? false

  const { data: membership } = await supabase
    .from('group_memberships').select('role')
    .eq('group_id', groupId).eq('user_id', user.id).eq('status', 'active').single()
  const isLeader = membership?.role === 'leader'

  if (!isAdmin && !isLeader) redirect('/')

  // Fields any leader or admin can change
  const updatePayload: Record<string, string | null> = {
    description:    (formData.get('description')    as string | null)?.trim() || null,
    description_ml: (formData.get('description_ml') as string | null)?.trim() || null,
    cover_image_url:(formData.get('cover_image_url') as string | null)?.trim() || null,
  }

  // Admin-only fields (name, name_ml, group_type)
  if (isAdmin) {
    const name = (formData.get('name') as string)?.trim()
    if (name) updatePayload.name = name
    updatePayload.name_ml    = (formData.get('name_ml')    as string | null)?.trim() || null
    updatePayload.group_type = (formData.get('group_type') as string) || 'functional'
  }

  await supabase.from('groups').update(updatePayload).eq('id', groupId)

  // Fetch current slug for path revalidation
  const { data: g } = await supabase.from('groups').select('slug').eq('id', groupId).single()
  if (g?.slug) {
    revalidatePath(`/groups/${g.slug}`)
    revalidatePath(`/manage/${g.slug}`)
  }
  revalidatePath('/groups')
}

