import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClaimFlow from './ClaimFlow'

export const metadata = { title: 'Find Your Household' }

export default async function ClaimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, claim_status')
    .eq('id', user.id)
    .single()

  // Already approved → go to home
  if (profile?.claim_status === 'approved' && profile?.status === 'active') redirect('/')
  // Already submitted → go to pending
  if (profile?.claim_status === 'pending_claim') redirect('/auth/pending')

  return (
    <div className="min-h-screen bg-[#f9f0e3] flex flex-col items-center justify-start pt-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-brand-900">Find Your Household</h1>
          <p className="text-sm text-muted-foreground">
            Search for your family in the parish registry and select yourself.
          </p>
          <p className="text-xs font-malayalam text-muted-foreground" lang="ml">
            ഇടവക രജിസ്ട്രിയിൽ നിങ്ങളുടെ കുടുംബം കണ്ടെത്തി സ്വയം തിരഞ്ഞെടുക്കുക.
          </p>
        </div>

        <div className="bg-[#fdf6eb] rounded-2xl border border-amber-100 shadow-sm p-5">
          <ClaimFlow />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Can&apos;t find your household?{' '}
          <span className="text-brand-900 font-medium">Contact the church office to be added to the registry.</span>
        </p>
      </div>
    </div>
  )
}
