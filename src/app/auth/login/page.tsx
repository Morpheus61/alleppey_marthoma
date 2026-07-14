'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { normalizePhone } from '@/lib/phone'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError(t('invalidPhone'))
      setLoading(false)
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalized,
    })

    if (otpError) {
      setError(otpError.message)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const normalized = normalizePhone(phone)!

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: 'sms',
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      // Profile is created via Supabase trigger (see migration)
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Church branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-brand-900 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">✝</span>
          </div>
          <h1 className="text-xl font-bold text-brand-900">
            St. George Marthoma Church
          </h1>
          <p className="text-sm text-muted-foreground">Alappuzha</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="phone" className="text-sm font-medium">
                  {t('phoneLabel')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-900 min-h-[44px]"
                  required
                />
                <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-900 text-white font-medium py-3 min-h-[44px] hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                {loading ? t('sending') : t('sendOtp')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('otpSentTo', { phone })}
              </p>
              <div className="space-y-1">
                <label htmlFor="otp" className="text-sm font-medium">
                  {t('otpLabel')}
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full rounded-lg border bg-background px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-900 min-h-[44px]"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg bg-brand-900 text-white font-medium py-3 min-h-[44px] hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                {loading ? t('verifying') : t('verify')}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {t('changePhone')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
