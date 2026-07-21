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

  // Fetch the registry member via security-definer RPC — bypasses RLS for
  // pending/unclaimed users who have no linked family_member row yet.
  // The function also verifies the member is unclaimed (no profile linked).
  const { data: claimableRows } = await supabase
    .rpc('get_family_member_for_claim', { p_id: familyMemberId })

  const registryMember = (claimableRows as { id: string; full_name: string; phone: string | null }[] | null)?.[0] ?? null
  if (!registryMember) return { error: 'Registry person not found or already claimed' }

  const profilePhone = (profile.phone ?? '').replace(/\D/g, '').slice(-10)
  const registryPhone = (registryMember.phone ?? '').replace(/\D/g, '').slice(-10)
  const autoApprove = profilePhone.length === 10
    && registryPhone.length === 10
    && profilePhone === registryPhone

  // Use a security-definer RPC to perform the profile update — the direct
  // UPDATE is blocked by the "profiles: update own" RLS WITH CHECK clause
  // which prevents changing the status column (needed for auto-approve).
  const { error } = await supabase.rpc('complete_claim', {
    p_family_member_id: familyMemberId,
    p_auto_approve:     autoApprove,
  })

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

  // Fetch house_name from the registry so we can sync it onto the profile
  let houseName: string | null = null
  if (claim.family_member_id) {
    const { data: fmRow } = await supabase
      .from('family_members')
      .select('family_units!family_id(house_name)')
      .eq('id', claim.family_member_id)
      .single()
    const fu = (fmRow as unknown as { family_units: { house_name: string } | null } | null)?.family_units
    houseName = fu?.house_name ?? null
  }

  const { error } = await supabase
    .from('profiles')
    .update({ claim_status: 'approved', status: 'active', ...(houseName ? { house_name: houseName } : {}) })
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
