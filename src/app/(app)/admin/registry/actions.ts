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

export async function createHouseholdWithProfile(formData: FormData): Promise<{ error: string } | { id: string }> {
  const { supabase } = await requireAdminOrAbove()

  const profileId  = formData.get('profile_id') as string
  const houseName  = (formData.get('house_name') as string).trim()
  const groupId    = formData.get('prayer_group_id') as string
  const address    = (formData.get('address') as string | null)?.trim() || null

  // 1. Create family unit
  const { data: fu, error: fuErr } = await supabase
    .from('family_units')
    .insert({ house_name: houseName, address, prayer_group_id: groupId })
    .select('id').single()
  if (fuErr) return { error: fuErr.message }

  // 2. Get profile name for the family_member row
  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name, full_name_ml, date_of_birth')
    .eq('id', profileId)
    .single()

  // 3. Create head family_member linked to the profile
  const { data: fm, error: fmErr } = await supabase
    .from('family_members')
    .insert({
      family_id:        fu.id,
      profile_id:       profileId,
      full_name:        prof?.full_name ?? 'Unknown',
      full_name_ml:     prof?.full_name_ml ?? null,
      relation_to_head: 'head',
      date_of_birth:    prof?.date_of_birth ?? null,
    })
    .select('id').single()
  if (fmErr) return { error: fmErr.message }

  // 4. Link the profile back (same mutations as linkProfileToMember)
  await supabase
    .from('profiles')
    .update({ family_member_id: fm.id, display_name: prof?.full_name, claim_status: 'approved', status: 'active' })
    .eq('id', profileId)

  revalidatePath('/admin/registry')
  return { id: fu.id }
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
  const { data: fm, error } = await supabase.from('family_members').insert({
    family_id:        formData.get('family_id') as string,
    profile_id:       profileId || null,
    full_name:        (formData.get('full_name') as string).trim(),
    full_name_ml:     (formData.get('full_name_ml') as string | null)?.trim() || null,
    relation_to_head: (formData.get('relation_to_head') as string | null)?.trim() || null,
    date_of_birth:    (formData.get('date_of_birth') as string | null) || null,
    gender:           (formData.get('gender') as string | null) || null,
    phone:            (formData.get('phone') as string | null)?.trim() || null,
    email:            (formData.get('email') as string | null)?.trim() || null,
  }).select('id').single()
  if (error) return { error: error.message }

  // If a profile was linked at creation time, update profiles.family_member_id too
  if (profileId && fm?.id) {
    await supabase
      .from('profiles')
      .update({ family_member_id: fm.id, claim_status: 'approved', status: 'active' })
      .eq('id', profileId)
  }

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

/** Update the household's Bhagam / prayer group */
export async function updateHouseholdPrayerGroup(familyId: string, groupId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  const { error } = await supabase
    .from('family_units')
    .update({ prayer_group_id: groupId || null })
    .eq('id', familyId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/registry/${familyId}`)
  return { success: true }
}

/** Set a member's full functional-group memberships (add selected, remove deselected) */
export async function setMemberGroupMemberships(
  profileId: string,
  selectedGroupIds: string[],
  allFunctionalGroupIds: string[],
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()

  // Remove deselected functional-group memberships
  const toRemove = allFunctionalGroupIds.filter(id => !selectedGroupIds.includes(id))
  if (toRemove.length) {
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('user_id', profileId)
      .in('group_id', toRemove)
    if (error) return { error: error.message }
  }

  // Upsert selected memberships
  if (selectedGroupIds.length) {
    const rows = selectedGroupIds.map(gid => ({
      group_id: gid, user_id: profileId, role: 'member' as const, status: 'active' as const,
    }))
    const { error } = await supabase
      .from('group_memberships')
      .upsert(rows, { onConflict: 'group_id,user_id' })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/registry')
  return { success: true }
}

export async function deleteHousehold(id: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  // unlink any profiles pointing to members of this household
  const { data: members } = await supabase.from('family_members').select('id').eq('family_id', id)
  if (members?.length) {
    await supabase.from('profiles').update({ family_member_id: null, claim_status: 'unclaimed' })
      .in('family_member_id', members.map(m => m.id))
  }
  const { error } = await supabase.from('family_units').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/registry')
  return { success: true }
}

/** Remove an account link from a family member */
export async function unlinkProfileFromMember(memberId: string, familyId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  // Clear family_member_id on the profile first
  await supabase.from('profiles').update({ family_member_id: null, claim_status: 'unclaimed' }).eq('family_member_id', memberId)
  const { error } = await supabase.from('family_members').update({ profile_id: null }).eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/registry/${familyId}`)
  return { success: true }
}

/** Record a life event for a family member */
export async function addLifeEvent(
  memberId: string,
  typeId: string,
  eventDate: string | null,
  notes: string | null,
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  // Get the type name for the legacy event_type text field
  const { data: t } = await supabase.from('life_event_types').select('name').eq('id', typeId).single()
  const { error } = await supabase.from('life_events').insert({
    family_member_id:    memberId,
    life_event_type_id:  typeId,
    event_type:          t?.name ?? null,
    event_date:          eventDate || null,
    notes:               notes || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/registry')
  return { success: true }
}

export async function linkProfileToMember(memberId: string, profileId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdminOrAbove()
  const { data: fm } = await supabase
    .from('family_members')
    .select('family_id, full_name, full_name_ml')
    .eq('id', memberId)
    .single()
  if (!fm) return { error: 'Family member not found' }

  // 0. Clear any previous family_member row that claims this profile
  //    (handles re-linking: e.g. account was under V E George, now moved to his Son)
  await supabase.from('family_members').update({ profile_id: null }).eq('profile_id', profileId)

  // 1. Set family_members.profile_id on the target member row
  const { error } = await supabase.from('family_members').update({ profile_id: profileId }).eq('id', memberId)
  if (error) return { error: error.message }

  // 2. Set profiles.family_member_id + display_name + activate
  //    display_name is updated to the linked member's name so pickers (role assignment,
  //    Convenors, etc.) show the correct person — not whoever registered the phone number.
  await supabase
    .from('profiles')
    .update({
      family_member_id: memberId,
      display_name:     fm.full_name,
      claim_status:     'approved',
      status:           'active',
    })
    .eq('id', profileId)

  revalidatePath(`/admin/registry/${fm.family_id}`)
  revalidatePath('/admin/roles')
  revalidatePath('/finance')
  return { success: true }
}
