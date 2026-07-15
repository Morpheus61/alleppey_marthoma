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
  const body       = (formData.get('body')      as string).trim()
  const body_ml    = (formData.get('body_ml')  as string | null)?.trim() || null
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
  await supabase
    .from('group_memberships')
    .update({ role: 'leader' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  revalidatePath(`/manage/${groupId}`)
}

export async function revokeLeader(groupId: string, userId: string) {
  const { supabase } = await requireLeaderOrAdmin(groupId)
  await supabase
    .from('group_memberships')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  revalidatePath(`/manage/${groupId}`)
}
