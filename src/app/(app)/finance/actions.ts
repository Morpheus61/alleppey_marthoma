'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitPayment(formData: FormData): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const typeId     = formData.get('type_id') as string
  const familyId   = formData.get('family_id') as string
  const channel    = formData.get('channel') as 'upi_declared' | 'neft_declared'
  const amount     = parseFloat(formData.get('amount') as string)
  const utr        = (formData.get('utr') as string | null)?.trim() || null
  const periodMonth = (formData.get('period_month') as string | null) || null

  if (!typeId || !familyId) return { error: 'Missing required fields' }
  if (!amount || amount <= 0) return { error: 'Invalid amount' }
  if (!utr) return { error: 'UTR / reference number is required' }

  const { error } = await supabase.from('contribution_entries').insert({
    contribution_type_id: typeId,
    family_id:            familyId,
    amount,
    channel,
    utr,
    period_month: periodMonth || null,
    status:       'submitted',
    recorded_by:  user.id,
  })

  if (error) {
    if (error.message.includes('uq_contribution_utr')) return { error: 'This UTR has already been submitted. Contact the church office if this is wrong.' }
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}
