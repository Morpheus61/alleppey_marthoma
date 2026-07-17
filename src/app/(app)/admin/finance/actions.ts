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
