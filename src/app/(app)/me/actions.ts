'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FamilyMember } from '@/types/database'

/**
 * Submit a change request for a family member record.
 * Does NOT update family_members directly — Admin reviews and approves via /admin/approvals.
 */
export async function requestFamilyMemberChange(
  memberId: string,
  currentData: Record<string, unknown>,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const proposed: Record<string, string | null> = {
    full_name:        (formData.get('full_name') as string).trim(),
    full_name_ml:     (formData.get('full_name_ml') as string | null)?.trim() || null,
    relation_to_head: (formData.get('relation_to_head') as string | null) || null,
    date_of_birth:    (formData.get('date_of_birth') as string | null) || null,
    gender:           (formData.get('gender') as string | null) || null,
    phone:            (formData.get('phone') as string | null)?.trim() || null,
    email:            (formData.get('email') as string | null)?.trim() || null,
  }

  if (!proposed.full_name) return { error: 'Name is required' }

  const { error } = await supabase.from('change_requests').insert({
    target_table:  'family_members',
    target_id:     memberId,
    change_type:   'update',
    current_data:  currentData,
    proposed_data: proposed,
    requested_by:  user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/me')
  return { success: true }
}

export async function updateMyProfile(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Parse family members from repeated form fields
  const names      = formData.getAll('fm_name')      as string[]
  const dobs       = formData.getAll('fm_dob')        as string[]
  const relations  = formData.getAll('fm_relation')   as string[]
  const familyMembers: FamilyMember[] = names
    .map((name, i) => ({
      name:     name.trim(),
      dob:      dobs[i]?.trim()       || null,
      relation: relations[i]?.trim()  || null,
    }))
    .filter(fm => fm.name)

  const isMobileWA = formData.get('is_mobile_whatsapp') === 'yes'

  const { error } = await supabase.from('profiles').update({
    full_name:          (formData.get('full_name')    as string).trim(),
    full_name_ml:       (formData.get('full_name_ml') as string | null)?.trim() || null,
    house_name:         (formData.get('house_name')   as string | null)?.trim() || null,
    date_of_birth:      (formData.get('date_of_birth') as string | null) || null,
    address:            (formData.get('address')      as string | null)?.trim() || null,
    phone_landline:     (formData.get('phone_landline') as string | null)?.trim() || null,
    is_mobile_whatsapp: isMobileWA,
    whatsapp_number:    isMobileWA ? null : (formData.get('whatsapp_number') as string | null)?.trim() || null,
    email:              (formData.get('email')        as string | null)?.trim() || null,
    family_members:     familyMembers,
  }).eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/me')
  revalidatePath('/')
  revalidatePath('/directory')
  return { success: true }
}

export async function adminUpdateProfile(memberId: string, formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/')

  const names      = formData.getAll('fm_name')      as string[]
  const dobs       = formData.getAll('fm_dob')        as string[]
  const relations  = formData.getAll('fm_relation')   as string[]
  const familyMembers: FamilyMember[] = names
    .map((name, i) => ({
      name:     name.trim(),
      dob:      dobs[i]?.trim()       || null,
      relation: relations[i]?.trim()  || null,
    }))
    .filter(fm => fm.name)

  const isMobileWA = formData.get('is_mobile_whatsapp') === 'yes'

  const { error } = await supabase.from('profiles').update({
    full_name:          (formData.get('full_name')    as string).trim(),
    full_name_ml:       (formData.get('full_name_ml') as string | null)?.trim() || null,
    house_name:         (formData.get('house_name')   as string | null)?.trim() || null,
    date_of_birth:      (formData.get('date_of_birth') as string | null) || null,
    address:            (formData.get('address')      as string | null)?.trim() || null,
    phone_landline:     (formData.get('phone_landline') as string | null)?.trim() || null,
    is_mobile_whatsapp: isMobileWA,
    whatsapp_number:    isMobileWA ? null : (formData.get('whatsapp_number') as string | null)?.trim() || null,
    email:              (formData.get('email')        as string | null)?.trim() || null,
    family_members:     familyMembers,
    status:             (formData.get('status') as 'active' | 'pending' | 'disabled') || 'active',
  }).eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath(`/directory/${memberId}`)
  revalidatePath('/directory')
  revalidatePath('/admin')
  return { success: true }
}

/* ── Photo URLs ──────────────────────────────── */

/** Called immediately after a successful storage upload on the /me page */
export async function updateMyPhoto(
  type: 'avatar' | 'family',
  url: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const field = type === 'avatar' ? 'avatar_url' : 'family_photo_url'
  const { error } = await supabase
    .from('profiles')
    .update({ [field]: url })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/me')
  revalidatePath('/directory')
  return { success: true }
}

/** Admin version — updates any member's photo URLs */
export async function adminUpdatePhoto(
  memberId: string,
  type: 'avatar' | 'family',
  url: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/')

  const field = type === 'avatar' ? 'avatar_url' : 'family_photo_url'
  const { error } = await supabase
    .from('profiles')
    .update({ [field]: url })
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath(`/directory/${memberId}`)
  revalidatePath('/directory')
  return { success: true }
}
