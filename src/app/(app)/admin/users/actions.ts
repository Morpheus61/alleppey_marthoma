'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { linkProfileToMember } from '@/app/(app)/admin/registry/actions'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin', 'super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')
  return { supabase, userId: user.id }
}

export async function adminDisableUser(profileId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update({ status: 'disabled' }).eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function adminEnableUser(profileId: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', profileId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

/**
 * Admin-initiated link: attach a profile to an existing unclaimed registry family_member.
 * Delegates to linkProfileToMember — the canonical single code path that handles the
 * bidirectional FK pair + claim_status='approved' + status='active'.
 */
export async function adminLinkToExistingMember(
  profileId: string,
  memberId: string,
): Promise<{ error: string } | { familyId: string }> {
  const { supabase } = await requireAdmin()

  // Pre-check: member must exist and must not already be linked
  const { data: fm } = await supabase
    .from('family_members')
    .select('family_id, profile_id')
    .eq('id', memberId)
    .single()
  if (!fm) return { error: 'Family member not found' }
  if (fm.profile_id) return { error: 'This member is already linked to another account' }

  // Delegate: single code path through linkProfileToMember
  const result = await linkProfileToMember(memberId, profileId)
  if ('error' in result) return result

  return { familyId: fm.family_id }
}

/**
 * Admin-initiated link: create a NEW household from profile data, link profile as head.
 * Mirrors createHouseholdWithProfile() in registry/actions but also activates the profile.
 */
export async function adminCreateHouseholdAndLink(formData: FormData): Promise<{ error: string } | { familyId: string }> {
  const { supabase } = await requireAdmin()

  const profileId = formData.get('profile_id') as string
  const houseName = (formData.get('house_name') as string).trim()
  const address   = (formData.get('address') as string | null)?.trim() || null
  const groupId   = (formData.get('prayer_group_id') as string | null) || null

  const { data: fu, error: fuErr } = await supabase
    .from('family_units')
    .insert({ house_name: houseName, address, prayer_group_id: groupId })
    .select('id').single()
  if (fuErr) return { error: fuErr.message }

  const { data: prof } = await supabase
    .from('profiles')
    .select('full_name, full_name_ml, date_of_birth')
    .eq('id', profileId)
    .single()

  const { data: fm, error: fmErr } = await supabase
    .from('family_members')
    .insert({
      family_id:        fu.id,
      profile_id:       profileId,
      full_name:        prof?.full_name ?? houseName,
      full_name_ml:     prof?.full_name_ml ?? null,
      relation_to_head: 'head',
      date_of_birth:    prof?.date_of_birth ?? null,
    })
    .select('id').single()
  if (fmErr) return { error: fmErr.message }

  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      family_member_id: fm.id,
      claim_status:     'approved',
      status:           'active',
      display_name:     prof?.full_name ?? null,
    })
    .eq('id', profileId)
  if (pErr) return { error: pErr.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin/registry')
  return { familyId: fu.id }
}

export interface ImportRow {
  name: string
  name_ml: string | null
  relation: string | null
  dob: string | null
}

/**
 * Import selected JSONB family_members entries as rows in the registry household.
 * Duplicate names (case-insensitive) are skipped; returns array of skipped names.
 * The JSONB column on profiles is left untouched — the registry copy is authoritative.
 */
export async function adminImportFamilyMembers(
  familyId: string,
  rows: ImportRow[],
): Promise<{ error: string } | { skipped: string[] }> {
  const { supabase } = await requireAdmin()

  const { data: existing } = await supabase
    .from('family_members')
    .select('full_name')
    .eq('family_id', familyId)

  const existingLower = new Set((existing ?? []).map(m => m.full_name.toLowerCase().trim()))

  const toInsert: {
    family_id: string
    full_name: string
    full_name_ml: string | null
    relation_to_head: string | null
    date_of_birth: string | null
  }[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const name = row.name.trim()
    if (!name) continue
    if (existingLower.has(name.toLowerCase())) {
      skipped.push(name)
      continue
    }
    toInsert.push({
      family_id:        familyId,
      full_name:        name,
      full_name_ml:     row.name_ml || null,
      relation_to_head: row.relation || null,
      date_of_birth:    row.dob || null,
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('family_members').insert(toInsert)
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/registry/${familyId}`)
  revalidatePath('/admin/users')
  return { skipped }
}
