'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CrossSpinner } from '@/components/ui/LoadingIndicator'

// ── Country list: Marthoma diaspora focus ──────────────────────────────────
type Country = { code: string; dial: string; flag: string; name: string; pattern: RegExp }

const COUNTRIES: Country[] = [
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India',          pattern: /^\d{10}$/ },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE',            pattern: /^\d{9}$/ },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'USA / Canada',   pattern: /^\d{10}$/ },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'UK',             pattern: /^\d{10}$/ },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia',      pattern: /^\d{9}$/ },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia',       pattern: /^\d{9,10}$/ },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore',      pattern: /^\d{8}$/ },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar',          pattern: /^\d{8}$/ },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait',         pattern: /^\d{8}$/ },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain',        pattern: /^\d{8}$/ },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman',           pattern: /^\d{8}$/ },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia',   pattern: /^\d{9}$/ },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany',        pattern: /^\d{10,11}$/ },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand',    pattern: /^\d{9}$/ },
]

type Step    = 'phone' | 'otp'
type Channel = 'whatsapp' | 'sms'

export default function LoginPage() {
  const router  = useRouter()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [country,           setCountry]           = useState<Country>(COUNTRIES[0])
  const [phoneInput,        setPhoneInput]         = useState('')
  const [step,              setStep]               = useState<Step>('phone')
  const [otp,               setOtp]                = useState('')
  const [loading,           setLoading]            = useState(false)
  const [error,             setError]              = useState<string | null>(null)
  const [otpChannel,        setOtpChannel]         = useState<Channel>('whatsapp')
  const [showPicker,        setShowPicker]         = useState(false)
  const [pickerSearch,      setPickerSearch]       = useState('')

  const isIndia      = country.code === 'IN'
  const nationalNum  = phoneInput.replace(/\D/g, '')
  const e164         = `${country.dial}${nationalNum}`
  const isValidNum   = country.pattern.test(nationalNum)

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.dial.includes(pickerSearch)
  )

  // Auto-redirect when a valid session already exists
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Send OTP ────────────────────────────────────────────────────────────
  async function sendOtp(channel: Channel) {
    if (!isValidNum) {
      setError(`Please enter a valid ${country.name} mobile number`)
      return
    }
    setError(null)
    setLoading(true)
    setOtpChannel(channel)

    // Pass channel directly to GoTrue — Supabase forwards it to Twilio Verify as
    // Channel=whatsapp or Channel=sms. ONE OTP send, no double billing.
    // TRIAL: shouldCreateUser: true — open signup (revert to false on launch day)
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true, channel },
    })

    if (otpErr) {
      setError(otpErr.message ?? 'Could not send OTP. Please try again.')
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────
  async function verifyOtp() {
    if (otp.length !== 6) { setError('Please enter the 6-digit code'); return }
    setError(null)
    setLoading(true)

    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: 'sms', // always 'sms' type regardless of delivery channel
    })

    if (verifyErr) {
      setError('Invalid or expired code. Please try again.')
    } else if (data?.user) {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  // ── Shared input style ──────────────────────────────────────────────────
  const inputCls = 'w-full rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-900 focus:bg-white min-h-[44px] transition-colors'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f0e3] px-4 py-10">

      {/* ── Card ── */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl shadow-2xl overflow-hidden border border-amber-100">

          {/* ── Header: cream / ivory ── */}
          <div className="bg-[#fdf6eb] px-6 pt-8 pb-6 flex flex-col items-center gap-3 border-b border-amber-100">
            <div
              role="img"
              aria-label="Mar Thoma Church Logo"
              style={{
                width: '100px', height: '100px',
                backgroundImage: 'url(/MarThoma_logo.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <div className="text-center">
              <h1 className="text-brand-900 font-bold text-xl leading-snug tracking-wide">
                St. George Marthoma
              </h1>
              <h1 className="text-brand-900 font-bold text-xl leading-snug tracking-wide">
                Syrian Church
              </h1>
              <div className="mt-2 flex items-center justify-center gap-3">
                <div className="h-px w-10 bg-amber-400/50" />
                <span className="text-amber-700 text-[0.65rem] font-semibold tracking-[0.25em] uppercase">
                  Alappuzha
                </span>
                <div className="h-px w-10 bg-amber-400/50" />
              </div>
            </div>
            <p className="text-amber-600/60 text-[0.65rem] italic tracking-widest">
              ✦&nbsp;Lighted to Lighten&nbsp;✦
            </p>
          </div>

          {/* ── Form area ── */}
          <div className="bg-white px-6 pt-6 pb-7">
            <p className="text-center text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-gray-400 mb-5">
              {step === 'phone' ? 'Sign in to your account' : 'Enter verification code'}
            </p>

            {/* ══════════════ PHONE STEP ══════════════ */}
            {step === 'phone' && (
              <div className="space-y-3">

                {/* Country + number row */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Mobile Number
                  </label>
                  <div className="flex gap-2" ref={dropdownRef}>

                    {/* Country code button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPicker(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-3 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors min-h-[44px] text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-900"
                        aria-haspopup="listbox"
                        aria-expanded={showPicker}
                      >
                        <span className="text-lg leading-none">{country.flag}</span>
                        <span className="text-gray-700">{country.dial}</span>
                        <span className="text-gray-400 text-[10px]">▾</span>
                      </button>

                      {/* Dropdown */}
                      {showPicker && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-amber-100 rounded-xl shadow-xl w-64 max-h-60 flex flex-col overflow-hidden">
                          <div className="p-2 border-b border-amber-50 sticky top-0 bg-white">
                            <input
                              type="text"
                              placeholder="Search country…"
                              value={pickerSearch}
                              onChange={e => setPickerSearch(e.target.value)}
                              className="w-full text-sm px-3 py-1.5 rounded-lg border border-amber-100 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-brand-900"
                              autoFocus
                            />
                          </div>
                          <ul role="listbox" className="overflow-y-auto flex-1">
                            {filteredCountries.map(c => (
                              <li
                                key={c.code + c.dial}
                                role="option"
                                aria-selected={c.code === country.code}
                                onClick={() => {
                                  setCountry(c)
                                  setShowPicker(false)
                                  setPickerSearch('')
                                  setPhoneInput('')
                                  setError(null)
                                }}
                                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm hover:bg-amber-50 transition-colors ${c.code === country.code ? 'bg-amber-50 font-semibold' : ''}`}
                              >
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 text-gray-800">{c.name}</span>
                                <span className="text-gray-400 text-xs">{c.dial}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Phone number input */}
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder={isIndia ? '98765 43210' : 'Mobile number'}
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isIndia
                      ? 'Enter your 10-digit Indian mobile number'
                      : `Enter your ${country.name} mobile number — OTP sent via WhatsApp`}
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                {/* ── India: WhatsApp (primary) + SMS (secondary) ── */}
                {isIndia ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => sendOtp('whatsapp')}
                      disabled={loading || !isValidNum}
                      className="w-full rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 text-white font-semibold py-3 min-h-[44px] transition-colors shadow flex items-center justify-center gap-2"
                    >
                      {loading && otpChannel === 'whatsapp' ? <CrossSpinner size={16} /> : null}
                      {loading && otpChannel === 'whatsapp' ? 'Sending…' : '💬 Send OTP via WhatsApp'}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendOtp('sms')}
                      disabled={loading || !isValidNum}
                      className="w-full rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-500 text-sm font-medium py-2.5 min-h-[44px] transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && otpChannel === 'sms' ? <CrossSpinner size={14} /> : null}
                      {loading && otpChannel === 'sms' ? 'Sending…' : '📱 Send via SMS instead'}
                    </button>
                  </div>
                ) : (
                  /* ── International: WhatsApp only ── */
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => sendOtp('whatsapp')}
                      disabled={loading || !isValidNum}
                      className="w-full rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 text-white font-semibold py-3 min-h-[44px] transition-colors shadow flex items-center justify-center gap-2"
                    >
                      {loading ? <CrossSpinner size={16} /> : null}
                      {loading ? 'Sending…' : '💬 Send OTP via WhatsApp'}
                    </button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      International members receive OTP via WhatsApp only
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ OTP STEP ══════════════ */}
            {step === 'otp' && (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  {otpChannel === 'whatsapp'
                    ? `✓ Code sent to your WhatsApp`
                    : `✓ Code sent via SMS`}
                  <br />
                  <span className="font-medium text-gray-700">{e164}</span>
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-900 focus:bg-white min-h-[44px] transition-colors"
                  autoFocus
                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-lg bg-brand-900 text-white font-semibold py-3 min-h-[44px] hover:bg-brand-800 disabled:opacity-50 transition-colors shadow flex items-center justify-center gap-2"
                >
                  {loading && <CrossSpinner size={16} />}
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </button>

                {/* Resend / change options */}
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">Didn&apos;t receive it?</p>

                  {/* Indian WhatsApp user can switch to SMS */}
                  {otpChannel === 'whatsapp' && isIndia && (
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); sendOtp('sms') }}
                      disabled={loading}
                      className="text-xs text-brand-900 underline underline-offset-2 hover:no-underline disabled:opacity-50"
                    >
                      Send via SMS instead
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => sendOtp(otpChannel)}
                    disabled={loading}
                    className="text-xs text-brand-900 underline underline-offset-2 hover:no-underline disabled:opacity-50"
                  >
                    Resend {otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} code
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Change number
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[0.6rem] text-amber-900/40 mt-5 tracking-wide">
          © {new Date().getFullYear()} St. George Marthoma Syrian Church, Alappuzha
        </p>
      </div>
    </div>
  )
}


