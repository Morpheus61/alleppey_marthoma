'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireFinance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: r } = await supabase.from('parish_roles')
    .select('role').eq('profile_id', user.id)
    .in('role', ['treasurer','admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!p?.is_admin && !r) redirect('/admin')
  return { supabase }
}

export async function updateSettings(formData: FormData): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const keys = ['church_upi_id','church_upi_name','church_bank_name','church_bank_account','church_bank_ifsc','receipt_prefix','masavari_start_year']
  for (const key of keys) {
    const val = (formData.get(key) as string | null) ?? ''
    const { error } = await supabase.from('app_settings')
      .upsert({ key, value: val }, { onConflict: 'key' })
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/finance/settings')
  return { success: true }
}

export async function verifyPayment(id: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const { error } = await supabase.from('contribution_entries')
    .update({ status: 'verified' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/finance/verify')
  return { success: true }
}

export async function rejectPayment(id: string, reason: string): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const { error } = await supabase.from('contribution_entries')
    .update({ status: 'rejected', reject_reason: reason }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/finance/verify')
  return { success: true }
}

// ── Collection type management ──────────────────────────────────────────────

export async function createCollection(formData: FormData): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const amountRaw = formData.get('amount') as string | null
  const { error } = await supabase.from('contribution_types').insert({
    fund_id:      formData.get('fund_id') as string,
    name:         (formData.get('name') as string).trim(),
    name_ml:      (formData.get('name_ml') as string | null)?.trim() || null,
    kind:         formData.get('kind') as string,
    amount_mode:  formData.get('amount_mode') as string,
    amount:       amountRaw ? parseFloat(amountRaw) : null,
    period_start: (formData.get('period_start') as string | null) || null,
    period_end:   (formData.get('period_end') as string | null) || null,
    is_active:    true,
    created_by:   user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/finance/collections')
  return { success: true }
}

export async function updateCollection(id: string, formData: FormData): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const amountRaw = formData.get('amount') as string | null
  const { error } = await supabase.from('contribution_types').update({
    name:         (formData.get('name') as string).trim(),
    name_ml:      (formData.get('name_ml') as string | null)?.trim() || null,
    amount_mode:  formData.get('amount_mode') as string,
    amount:       amountRaw ? parseFloat(amountRaw) : null,
    period_start: (formData.get('period_start') as string | null) || null,
    period_end:   (formData.get('period_end') as string | null) || null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/finance/collections')
  return { success: true }
}

export async function toggleCollection(id: string, isActive: boolean): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireFinance()
  const { error } = await supabase.from('contribution_types').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/finance/collections')
  return { success: true }
}
