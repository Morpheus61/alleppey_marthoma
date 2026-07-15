'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FamilyMember } from '@/types/database'

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
