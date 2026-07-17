'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function claimFamilyMember(
  familyMemberId: string
): Promise<{ error: string } | { success: true; autoApproved: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Only pending-unclaimed profiles may claim
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, status, claim_status, phone')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }
  if (profile.claim_status !== 'unclaimed') return { error: 'Claim already submitted' }

  // Check the registry member isn't already claimed
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('family_member_id', familyMemberId)
    .maybeSingle()

  if (existing) return { error: 'This person is already linked to another account' }

  // Auto-approve if registry member's phone matches this account's phone
  const { data: registryMember } = await supabase
    .from('family_members')
    .select('id, full_name, phone')
    .eq('id', familyMemberId)
    .single()

  if (!registryMember) return { error: 'Registry person not found' }

  const profilePhone = (profile.phone ?? '').replace(/\D/g, '').slice(-10)
  const registryPhone = (registryMember.phone ?? '').replace(/\D/g, '').slice(-10)
  const autoApprove = profilePhone.length === 10
    && registryPhone.length === 10
    && profilePhone === registryPhone

  const { error } = await supabase
    .from('profiles')
    .update({
      family_member_id: familyMemberId,
      display_name:     registryMember.full_name,
      claim_status:     autoApprove ? 'approved' : 'pending_claim',
      status:           autoApprove ? 'active'   : 'pending',
    })
    .eq('id', user.id)
    .eq('claim_status', 'unclaimed')   // guard against race condition

  if (error) return { error: error.message }

  if (autoApprove) {
    revalidatePath('/')
    return { success: true, autoApproved: true }
  }

  revalidatePath('/auth/pending')
  return { success: true, autoApproved: false }
}

export async function approveClaim(profileId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Only admin can approve
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!me?.is_admin && !roleRow) return { error: 'Permission denied' }

  const { data: claim } = await supabase
    .from('profiles')
    .select('family_member_id, display_name')
    .eq('id', profileId)
    .eq('claim_status', 'pending_claim')
    .single()

  if (!claim) return { error: 'No pending claim found for this profile' }

  const { error } = await supabase
    .from('profiles')
    .update({ claim_status: 'approved', status: 'active' })
    .eq('id', profileId)
    .eq('claim_status', 'pending_claim')

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'claim.approved',
    target_table: 'profiles',
    target_id: profileId,
    details: { family_member_id: claim.family_member_id },
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function denyClaim(profileId: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!me?.is_admin && !roleRow) return { error: 'Permission denied' }

  const { error } = await supabase
    .from('profiles')
    .update({
      family_member_id: null,
      display_name:     null,
      claim_status:     'unclaimed',
      status:           'pending',
    })
    .eq('id', profileId)
    .eq('claim_status', 'pending_claim')

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'claim.denied',
    target_table: 'profiles',
    target_id: profileId,
    details: {},
  })

  revalidatePath('/admin')
  return { success: true }
}
