import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types/database'
import MemberForm from '@/components/directory/MemberForm'
import { adminUpdateProfile } from '../../me/actions'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('full_name').eq('id', params.id).single()
  return { title: `Edit · ${data?.full_name ?? 'Member'}` }
}

export default async function MemberEditPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) redirect('/')

  const { data } = await supabase.from('profiles').select('*').eq('id', params.id).single()
  const member = data as Profile | null
  if (!member) notFound()

  const updateAction = adminUpdateProfile.bind(null, params.id)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href="/directory" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Back to Directory</Link>
        <h1 className="text-2xl font-bold text-brand-900">Edit Member</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{member.full_name}</p>
      </div>

      <MemberForm profile={member} action={updateAction} adminMode={true} />
    </div>
  )
}
