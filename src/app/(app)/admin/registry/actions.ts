'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdminOrAbove() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')
  return { supabase, userId: user.id }
}

export async function createHousehold(formData: FormData): Promise<{ error: string } | { id: string }> {
  const { supabase } = await requireAdminOrAbove()
  const { data, error } = await supabase.from('family_units').insert({
    house_name:       (formData.get('house_name') as string).trim(),
    house_name_ml:    (formData.get('house_name_ml') as string | null)?.trim() || null,
    address:          (formData.get('address') as string | null)?.trim() || null,
    prayer_group_id:  formData.get('prayer_group_id') as string,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/registry')
  return { id: data.id }
}

export async function addFamilyMember(formData: FormData): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  const profileId = (formData.get('profile_id') as string | null)?.trim() || null
  const { error } = await supabase.from('family_members').insert({
    family_id:        formData.get('family_id') as string,
    profile_id:       profileId || null,
    full_name:        (formData.get('full_name') as string).trim(),
    full_name_ml:     (formData.get('full_name_ml') as string | null)?.trim() || null,
    relation_to_head: (formData.get('relation_to_head') as string | null)?.trim() || null,
    date_of_birth:    (formData.get('date_of_birth') as string | null) || null,
    gender:           (formData.get('gender') as string | null) || null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/admin/registry/${formData.get('family_id')}`)
  return { success: true }
}

export async function updateHousehold(formData: FormData): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  const id = formData.get('id') as string
  const { error } = await supabase.from('family_units').update({
    house_name:       (formData.get('house_name') as string).trim(),
    house_name_ml:    (formData.get('house_name_ml') as string | null)?.trim() || null,
    address:          (formData.get('address') as string | null)?.trim() || null,
    prayer_group_id:  formData.get('prayer_group_id') as string,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/registry/${id}`)
  revalidatePath('/admin/registry')
  return { success: true }
}

export async function addMembersToGroup(groupId: string, profileIds: string[]): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  if (!profileIds.length) return { error: 'Select at least one member.' }
  const rows = profileIds.map(uid => ({ group_id: groupId, user_id: uid, role: 'member' as const, status: 'active' as const }))
  const { error } = await supabase
    .from('group_memberships')
    .upsert(rows, { onConflict: 'group_id,user_id', ignoreDuplicates: false })
  if (error) return { error: error.message }
  revalidatePath('/admin/registry')
  return { success: true }
}

export async function linkProfileToMember(memberId: string, profileId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  const { data: fm } = await supabase.from('family_members').select('family_id').eq('id', memberId).single()
  if (!fm) return { error: 'Family member not found' }
  const { error } = await supabase.from('family_members').update({ profile_id: profileId }).eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/registry/${fm.family_id}`)
  return { success: true }
}
