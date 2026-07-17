import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from '@/components/auth/SignOutButton'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, claim_status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'active') redirect('/')

  const claimStatus = profile?.claim_status ?? 'unclaimed'

  const messages: Record<string, { en: string; ml: string }> = {
    unclaimed: {
      en: 'Please search for your household to complete registration.',
      ml: 'രജിസ്ട്രേഷൻ പൂർത്തിയാക്കാൻ നിങ്ങളുടെ കുടുംബം കണ്ടെത്തുക.',
    },
    pending_claim: {
      en: 'Your identity has been submitted and is awaiting approval by the church office.',
      ml: 'നിങ്ങളുടെ അപേക്ഷ ചർച്ച് ഓഫീസിന്റെ അനുമതിക്കായി കാത്തിരിക്കുകയാണ്.',
    },
    approved: {
      en: 'Your identity has been approved. Your account is being activated.',
      ml: 'നിങ്ങളുടെ ഐഡന്റിറ്റി അനുമതി ലഭിച്ചു. അക്കൗണ്ട് സജീവമാക്കുന്നു.',
    },
  }

  const msg = messages[claimStatus] ?? messages.unclaimed

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f0e3] px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">{claimStatus === 'unclaimed' ? '🏠' : '⏳'}</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-brand-900">
            {claimStatus === 'unclaimed' ? 'Find Your Household' : 'Registration Pending'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{msg.en}</p>
          <p className="text-muted-foreground text-sm font-malayalam leading-relaxed" lang="ml">{msg.ml}</p>
        </div>

        {claimStatus === 'unclaimed' && (
          <Link href="/auth/claim"
            className="block w-full rounded-xl bg-brand-900 text-white font-semibold py-3 text-sm hover:bg-brand-800 transition-colors">
            Search for my Household →
          </Link>
        )}

        {claimStatus === 'pending_claim' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Please contact the church office or the Vicar for approval.
          </div>
        )}

        <SignOutButton />
      </div>
    </div>
  )
}

