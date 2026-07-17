'use client'
import { useState } from 'react'
import { verifyPayment, rejectPayment } from '../actions'

interface Entry {
  id: string; amount: number; channel: string; utr: string | null
  status: string; created_at: string; receipt_number: string | null
  period_month: string | null
  contribution_types: { name: string; name_ml: string | null } | null
  family_units: { house_name: string; house_name_ml: string | null } | null
}

export default function VerifyClient({ entries }: { entries: Entry[] }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(id: string) {
    setProcessing(id); setError(null)
    const result = await verifyPayment(id)
    setProcessing(null)
    if ('error' in result) setError(result.error)
  }

  async function handleReject(id: string) {
    if (!reason.trim()) return
    setProcessing(id); setError(null)
    const result = await rejectPayment(id, reason)
    setProcessing(null)
    setRejectingId(null)
    setReason('')
    if ('error' in result) setError(result.error)
  }

  if (entries.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-12">No pending payments — all verified.</p>
  )

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600 px-1">{error}</p>}
      {entries.map(e => {
        const month = e.period_month
          ? new Date(e.period_month + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : null
        const type = e.contribution_types
        const family = e.family_units
        return (
          <div key={e.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm">
                  ₹{e.amount}
                  {month && <span className="text-muted-foreground font-normal"> · {month}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {family?.house_name_ml ?? family?.house_name ?? '—'}
                  {type ? ` · ${type.name_ml ?? type.name}` : ''}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {e.channel.replace(/_/g,' ')}
                  {e.utr && <> · UTR: <span className="font-mono">{e.utr}</span></>}
                </p>
                <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                {e.status}
              </span>
            </div>

            {rejectingId === e.id ? (
              <div className="space-y-2">
                <input value={reason} onChange={ev => setReason(ev.target.value)}
                  placeholder="Reason for rejection…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
                <div className="flex gap-2">
                  <button onClick={() => handleReject(e.id)} disabled={!reason.trim() || processing === e.id}
                    className="flex-1 rounded-lg bg-red-600 text-white text-xs font-semibold py-2 hover:bg-red-700 disabled:opacity-50">
                    {processing === e.id ? '…' : 'Confirm Reject'}
                  </button>
                  <button onClick={() => { setRejectingId(null); setReason('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleVerify(e.id)} disabled={processing === e.id}
                  className="flex-1 rounded-lg bg-green-600 text-white text-xs font-semibold py-2 hover:bg-green-700 disabled:opacity-50">
                  {processing === e.id ? '…' : '✓ Verify & Issue Receipt'}
                </button>
                <button onClick={() => setRejectingId(e.id)} disabled={!!processing}
                  className="rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-3 py-2 hover:bg-red-50 disabled:opacity-50">
                  Reject
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
