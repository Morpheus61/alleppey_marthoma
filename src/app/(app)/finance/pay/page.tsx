import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PayNowClient from './PayNowClient'

export const metadata = { title: 'Pay Now' }

interface Props { searchParams: Promise<{ type?: string; month?: string }> }

export default async function PayNowPage({ searchParams }: Props) {
  const { type: typeId, month } = await searchParams
  if (!typeId) redirect('/finance')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if (profileData?.status !== 'active') redirect('/')

  // Get contribution type
  const { data: type } = await supabase
    .from('contribution_types')
    .select('id, name, name_ml, kind, amount_mode, amount')
    .eq('id', typeId).eq('is_active', true).single()
  if (!type) notFound()

  // Get member's family
  const { data: fm } = await supabase
    .from('family_members')
    .select('family_id, family_units(house_name, house_name_ml)')
    .eq('profile_id', user.id).maybeSingle()
  if (!fm?.family_id) redirect('/finance')

  const fu = fm.family_units as unknown as { house_name: string; house_name_ml: string | null } | null

  // App settings
  const { data: settings } = await supabase.from('app_settings').select('key, value')
  const s = (k: string) => settings?.find(x => x.key === k)?.value ?? ''

  return (
    <PayNowClient
      type={type}
      familyId={fm.family_id}
      houseName={fu?.house_name_ml ? `${fu.house_name_ml} — ${fu.house_name}` : (fu?.house_name ?? '')}
      periodMonth={month ?? null}
      paySettings={{
        upiId:       s('church_upi_id'),
        upiName:     s('church_upi_name') || 'St George Marthoma Church',
        bankName:    s('church_bank_name'),
        bankAccount: s('church_bank_account'),
        bankIfsc:    s('church_bank_ifsc'),
      }}
    />
  )
}
