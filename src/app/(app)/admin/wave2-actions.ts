'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ParishRoleKind } from '@/types/database'

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check new parish_roles table first, fall back to legacy is_admin
  const { data: roleRow } = await supabase
    .from('parish_roles')
    .select('id')
    .eq('profile_id', user.id)
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .single()

  if (!roleRow) {
    // Legacy fallback: check is_admin
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) redirect('/')
  }

  return { supabase, userId: user.id }
}

async function requireAdminOrAbove() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roleRow } = await supabase
    .from('parish_roles')
    .select('id')
    .eq('profile_id', user.id)
    .in('role', ['admin', 'super_admin'])
    .is('revoked_at', null)
    .single()

  if (!roleRow) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) redirect('/')
  }

  return { supabase, userId: user.id }
}

// ── Role Management (super_admin only) ────────────────────────────────────────

export async function assignRole(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireSuperAdmin()
  const profileId = formData.get('profile_id') as string
  const role      = formData.get('role') as ParishRoleKind
  if (!profileId || !role) return

  await supabase.from('parish_roles').insert({
    profile_id:  profileId,
    role,
    assigned_by: userId,
  })

  await supabase.from('audit_log').insert({
    actor_id:     userId,
    action:       'role.assign',
    target_table: 'parish_roles',
    target_id:    profileId,
    details:      { role },
  })

  revalidatePath('/admin/roles')
}

export async function revokeRole(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireSuperAdmin()
  const roleId = formData.get('roleId') as string
  if (!roleId) return

  await supabase
    .from('parish_roles')
    .update({ revoked_by: userId, revoked_at: new Date().toISOString() })
    .eq('id', roleId)
    .is('revoked_at', null)

  await supabase.from('audit_log').insert({
    actor_id:     userId,
    action:       'role.revoke',
    target_table: 'parish_roles',
    target_id:    roleId,
    details:      {},
  })

  revalidatePath('/admin/roles')
}

// ── Change Requests ───────────────────────────────────────────────────────────

export async function submitChangeRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const targetTable   = formData.get('target_table') as string
  const targetId      = (formData.get('target_id') as string) || null
  const changeType    = (formData.get('change_type') as 'insert' | 'update' | 'delete') || 'update'
  const currentData   = formData.get('current_data')  ? JSON.parse(formData.get('current_data') as string) : null
  const proposedData  = JSON.parse(formData.get('proposed_data') as string)

  const { error } = await supabase.from('change_requests').insert({
    target_table:  targetTable,
    target_id:     targetId,
    change_type:   changeType,
    current_data:  currentData,
    proposed_data: proposedData,
    requested_by:  user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/approvals')
  return { success: true }
}

export async function approveChangeRequest(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin()
  const requestId = formData.get('requestId') as string
  if (!requestId) return

  const { error } = await supabase.rpc('apply_change_request', { p_request_id: requestId })
  if (error) console.error('[approveChangeRequest]', error.message)

  revalidatePath('/admin/approvals')
  revalidatePath('/')
}

export async function rejectChangeRequest(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireSuperAdmin()
  const requestId = formData.get('requestId') as string
  const remarks   = (formData.get('remarks') as string | null)?.trim() || 'Rejected'

  if (!requestId) return

  const { error } = await supabase
    .from('change_requests')
    .update({
      status:          'rejected',
      reviewed_by:     userId,
      reviewed_at:     new Date().toISOString(),
      review_remarks:  remarks,
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) { console.error('[rejectChangeRequest]', error.message); return }

  await supabase.from('audit_log').insert({
    actor_id:     userId,
    action:       'change_request.reject',
    target_table: 'change_requests',
    target_id:    requestId,
    details:      { remarks },
  })

  revalidatePath('/admin/approvals')
}

// ── Registry ──────────────────────────────────────────────────────────────────

export async function createFamilyUnit(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin()

  const { data, error } = await supabase.from('family_units').insert({
    house_name:       (formData.get('house_name') as string).trim(),
    house_name_ml:    (formData.get('house_name_ml') as string | null)?.trim() || null,
    address:          (formData.get('address') as string | null)?.trim() || null,
    prayer_group_id:  formData.get('prayer_group_id') as string,
  }).select('id').single()

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id:     userId,
    action:       'registry.family.create',
    target_table: 'family_units',
    target_id:    data.id,
    details:      { house_name: formData.get('house_name') },
  })

  revalidatePath('/admin/registry')
  return { success: true, id: data.id }
}

export async function recordLifeEvent(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin()

  const { error } = await supabase.from('life_events').insert({
    family_member_id:   formData.get('family_member_id') as string,
    event_type:         formData.get('event_type') as string,
    event_date:         formData.get('event_date') as string,
    place:              (formData.get('place') as string | null)?.trim() || null,
    officiant:          (formData.get('officiant') as string | null)?.trim() || null,
    register_number:    (formData.get('register_number') as string | null)?.trim() || null,
    certificate_number: (formData.get('certificate_number') as string | null)?.trim() || null,
    remarks:            (formData.get('remarks') as string | null)?.trim() || null,
    recorded_by:        userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/registry')
  return { success: true }
}

// ── Finance ───────────────────────────────────────────────────────────────────

export async function createFund(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin()

  const { error } = await supabase.from('funds').insert({
    name:                (formData.get('name') as string).trim(),
    name_ml:             (formData.get('name_ml') as string | null)?.trim() || null,
    description:         (formData.get('description') as string | null)?.trim() || null,
    bank_account_label:  (formData.get('bank_account_label') as string | null)?.trim() || null,
    created_by:          userId,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/finance')
  return { success: true }
}

export async function createContributionType(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin()

  const amountStr = formData.get('amount') as string | null
  const targetStr = formData.get('target_amount') as string | null

  const { error } = await supabase.from('contribution_types').insert({
    fund_id:           formData.get('fund_id') as string,
    name:              (formData.get('name') as string).trim(),
    name_ml:           (formData.get('name_ml') as string | null)?.trim() || null,
    kind:              formData.get('kind') as 'subscription' | 'service_offertory' | 'appeal',
    amount_mode:       formData.get('amount_mode') as 'fixed' | 'suggested' | 'open',
    amount:            amountStr ? parseFloat(amountStr) : null,
    period_start:      (formData.get('period_start') as string | null) || null,
    period_end:        (formData.get('period_end') as string | null) || null,
    target_amount:     targetStr ? parseFloat(targetStr) : null,
    target_visibility: (formData.get('target_visibility') as 'parish' | 'office') || 'office',
    created_by:        userId,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/finance')
  return { success: true }
}

export async function recordCashEntry(formData: FormData) {
  const { supabase, userId } = await requireAdminOrAbove()

  const { data, error } = await supabase.from('contribution_entries').insert({
    contribution_type_id: formData.get('contribution_type_id') as string,
    family_id:            formData.get('family_id') as string,
    member_id:            (formData.get('member_id') as string | null) || null,
    amount:               parseFloat(formData.get('amount') as string),
    channel:              'cash',
    period_month:         (formData.get('period_month') as string | null) || null,
    status:               'verified',   // cash is verified immediately
    recorded_by:          userId,
    verified_by:          userId,
    verified_at:          new Date().toISOString(),
  }).select('id, receipt_number').single()

  if (error) return { error: error.message }
  revalidatePath('/admin/finance')
  return { success: true, receipt_number: data?.receipt_number }
}

export async function submitUpiContribution(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const utr = (formData.get('utr') as string)?.trim() || null

  const { error } = await supabase.from('contribution_entries').insert({
    contribution_type_id: formData.get('contribution_type_id') as string,
    family_id:            formData.get('family_id') as string,
    amount:               parseFloat(formData.get('amount') as string),
    channel:              formData.get('channel') as 'upi_declared' | 'neft_declared',
    period_month:         (formData.get('period_month') as string | null) || null,
    utr,
    status:               'submitted',
    recorded_by:          user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { success: true }
}

export async function verifyContribution(entryId: string) {
  const { supabase, userId } = await requireAdminOrAbove()

  const { error } = await supabase
    .from('contribution_entries')
    .update({ status: 'verified', verified_by: userId })
    .eq('id', entryId)
    .eq('status', 'submitted')

  if (error) return { error: error.message }
  revalidatePath('/admin/finance')
  return { success: true }
}

export async function rejectContribution(entryId: string, reason: string) {
  const { supabase, userId } = await requireAdminOrAbove()

  const { error } = await supabase
    .from('contribution_entries')
    .update({ status: 'rejected', verified_by: userId, reject_reason: reason })
    .eq('id', entryId)
    .eq('status', 'submitted')

  if (error) return { error: error.message }
  revalidatePath('/admin/finance')
  return { success: true }
}

export async function updateAppSetting(key: string, value: string) {
  const { supabase, userId } = await requireSuperAdmin()

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
