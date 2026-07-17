'use client'
import { useState } from 'react'
import { submitPayment } from '../actions'

interface ContribType {
  id: string; name: string; name_ml: string | null
  kind: string; amount_mode: string; amount: number | null
}
interface PaySettings {
  upiId: string; upiName: string
  bankName: string; bankAccount: string; bankIfsc: string
}

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white'

export default function PayNowClient({
  type, familyId, houseName, periodMonth, paySettings,
}: {
  type: ContribType
  familyId: string
  houseName: string
  periodMonth: string | null  // 'YYYY-MM-DD' for Masavari
  paySettings: PaySettings
}) {
  const isFixed   = type.amount_mode === 'fixed' && type.amount
  const [amount, setAmount]   = useState(isFixed ? String(type.amount) : '')
  const [channel, setChannel] = useState<'upi_declared'|'neft_declared'>('upi_declared')
  const [utr, setUtr]         = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const monthLabel = periodMonth
    ? new Date(periodMonth + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null

  // UPI URL
  const note = [type.name, monthLabel, houseName].filter(Boolean).join(' — ').slice(0, 50)
  const upiUrl = paySettings.upiId
    ? `upi://pay?pa=${encodeURIComponent(paySettings.upiId)}&pn=${encodeURIComponent(paySettings.upiName || 'Church')}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
    : null
  const qrUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!utr.trim()) { setError('Enter the UTR / transaction reference'); return }
    setSaving(true); setError(null)
    const fd = new FormData()
    fd.set('type_id',     type.id)
    fd.set('family_id',   familyId)
    fd.set('channel',     channel)
    fd.set('amount',      amount)
    fd.set('utr',         utr.trim())
    if (periodMonth) fd.set('period_month', periodMonth)
    const result = await submitPayment(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setDone(true)
  }

  if (done) return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center space-y-4">
      <div className="text-5xl">✓</div>
      <h2 className="text-xl font-bold text-brand-900">Payment Submitted</h2>
      <p className="text-sm text-muted-foreground">
        Your payment of ₹{amount}{monthLabel ? ` for ${monthLabel}` : ''} has been submitted for verification.
        You will receive a receipt once verified by the church office.
      </p>
      <a href="/finance" className="block mt-4 text-sm font-semibold text-brand-900 underline">← Back to My Subscriptions</a>
    </div>
  )

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <a href="/finance" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← My Subscriptions</a>
        {type.name_ml && <p className="font-bold text-lg font-malayalam text-brand-900" lang="ml">{type.name_ml}</p>}
        <h1 className="text-xl font-bold text-brand-900">{type.name}</h1>
        {monthLabel && <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>}
        <p className="text-sm text-muted-foreground">{houseName}</p>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (₹)</label>
        {isFixed ? (
          <p className="text-3xl font-bold text-brand-900">₹{type.amount}</p>
        ) : (
          <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount" className={`${inp} text-lg font-semibold`} />
        )}
      </div>

      {/* Channel tabs */}
      <div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-4">
          {[
            { key: 'upi_declared',  label: 'UPI / QR' },
            { key: 'neft_declared', label: 'Bank Transfer' },
          ].map(({ key, label }) => (
            <button key={key} type="button"
              onClick={() => { setChannel(key as typeof channel); setShowPaid(false) }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                channel === key ? 'bg-brand-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* UPI tab */}
        {channel === 'upi_declared' && (
          <div className="space-y-4">
            {qrUrl ? (
              <>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="UPI QR Code" width={240} height={240}
                    className="rounded-xl border border-gray-100 shadow-sm" />
                </div>
                <p className="text-[11px] text-center text-muted-foreground">
                  Scan with any UPI app — Google Pay, PhonePe, BHIM, Paytm
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {upiUrl && (
                    <a href={upiUrl}
                      className="block text-center text-xs font-semibold py-2.5 rounded-xl border border-brand-200 text-brand-900 bg-brand-50 hover:bg-brand-100">
                      Open UPI App
                    </a>
                  )}
                  <a href={qrUrl} download="payment-qr.png" target="_blank" rel="noreferrer"
                    className="block text-center text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100">
                    Download QR
                  </a>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                UPI ID not configured yet. Contact the church office.
              </div>
            )}
          </div>
        )}

        {/* Bank Transfer tab */}
        {channel === 'neft_declared' && (
          <div className="space-y-2 text-sm">
            {paySettings.bankName ? (
              <>
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1.5">
                  <p><span className="font-medium text-gray-500">Bank:</span> {paySettings.bankName}</p>
                  <p><span className="font-medium text-gray-500">Account:</span> <span className="font-mono">{paySettings.bankAccount}</span></p>
                  <p><span className="font-medium text-gray-500">IFSC:</span> <span className="font-mono">{paySettings.bankIfsc}</span></p>
                  <p className="text-xs text-muted-foreground pt-1">
                    Remarks: <span className="font-medium">{note}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                Bank details not configured yet. Contact the church office.
              </div>
            )}
          </div>
        )}
      </div>

      {/* I've Paid / UTR section */}
      {!showPaid ? (
        <button onClick={() => setShowPaid(true)} disabled={!amount}
          className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors">
          I&apos;ve Paid →
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
              UTR / Transaction Reference *
            </label>
            <input value={utr} onChange={e => setUtr(e.target.value)} required
              placeholder="12-digit UTR or transaction ID" className={inp} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Found in your UPI app or bank SMS after the transfer.
            </p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !utr.trim()}
            className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit Payment'}
          </button>
          <button type="button" onClick={() => setShowPaid(false)}
            className="w-full text-xs text-muted-foreground underline">
            Cancel
          </button>
        </form>
      )}
    </div>
  )
}
