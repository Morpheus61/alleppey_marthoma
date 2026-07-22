import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComposeForm from './ComposeForm'

export const metadata = { title: 'New Pulpit Message' }

export default async function ComposePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect logged-out visitors to login (not to /pulpit)
  if (!user) redirect('/auth/login?next=/pulpit/compose')

  const { data: roleRow } = await supabase
    .from('parish_roles')
    .select('id')
    .eq('profile_id', user.id)
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .maybeSingle()

  // Only super_admin (Vicar) may compose pulpit messages
  if (!roleRow) redirect('/pulpit')

  return <ComposeForm />
}
