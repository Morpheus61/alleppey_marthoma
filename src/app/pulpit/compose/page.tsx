import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComposeForm from './ComposeForm'

export const metadata = { title: 'New Pulpit Message' }

export default async function ComposePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect logged-out visitors to login (not to /pulpit)
  if (!user) redirect('/auth/login?next=/pulpit/compose')

  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('parish_roles').select('id')
      .eq('profile_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .is('revoked_at', null)
      .maybeSingle(),
  ])

  // Redirect non-admins to the feed
  if (!profile?.is_admin && !roleRow) redirect('/pulpit')

  return <ComposeForm />
}
