'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
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
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-sm">

        {/* ── Card ── */}
        <div className="rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Hero header ── */}
          <div className="relative bg-brand-900 pt-10 pb-8 px-6 flex flex-col items-center gap-4">
            {/* Subtle dot-grid texture */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='white'/%3E%3C/svg%3E\")",
              }}
            />

            {/* Logo in gold-tinted ring */}
            <div className="relative z-10 p-2 rounded-full ring-2 ring-amber-300/50 bg-brand-800/50 shadow-xl">
              <div className="relative w-24 h-24">
                <Image
                  src="/MarThoma_logo.png"
                  alt="Mar Thoma Church Logo"
                  fill
                  className="object-contain drop-shadow"
                  priority
                />
              </div>
            </div>

            {/* Church name */}
            <div className="relative z-10 text-center">
              <h1 className="text-white font-bold text-xl leading-snug tracking-wide drop-shadow">
                St. George Marthoma
              </h1>
              <h1 className="text-white font-bold text-xl leading-snug tracking-wide drop-shadow">
                Syrian Church
              </h1>
              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="h-px w-10 bg-amber-300/40" />
                <span className="text-amber-200/80 text-[0.65rem] font-semibold tracking-[0.25em] uppercase">
                  Alappuzha
                </span>
                <div className="h-px w-10 bg-amber-300/40" />
              </div>
            </div>

            {/* Motto */}
            <p className="relative z-10 text-amber-200/60 text-[0.65rem] italic tracking-widest">
              ✦&nbsp;Lighted to Lighten&nbsp;✦
            </p>
          </div>

          {/* ── Form area ── */}
          <div className="bg-white px-6 pt-6 pb-7">
            <p className="text-center text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-5">
              {step === 'phone' ? 'Sign in to your account' : 'Enter verification code'}
            </p>

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
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
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-900 focus:bg-white min-h-[44px] transition-colors"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-brand-900 text-white font-semibold py-3 min-h-[44px] hover:bg-brand-800 disabled:opacity-50 transition-colors shadow"
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
                  <label htmlFor="otp" className="text-sm font-medium text-gray-700">
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
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-900 focus:bg-white min-h-[44px] transition-colors"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-lg bg-brand-900 text-white font-semibold py-3 min-h-[44px] hover:bg-brand-800 disabled:opacity-50 transition-colors shadow"
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

        <p className="text-center text-[0.6rem] text-gray-400 mt-5 tracking-wide">
          © {new Date().getFullYear()} St. George Marthoma Syrian Church, Alappuzha
        </p>
      </div>
    </div>
  )
}
