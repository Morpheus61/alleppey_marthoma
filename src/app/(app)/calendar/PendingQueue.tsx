'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react'
import { approveEvent, rejectEvent } from './actions'
import { IST_TZ } from '@/lib/dates'

interface PendingEvent {
  id: string
  title: string
  title_ml: string | null
  starts_at: string
  venue: string | null
  approval_status: string
  groups: { name: string; name_ml: string | null; group_type: string } | null
}

export default function PendingQueue({ events }: { events: PendingEvent[] }) {
  const router = useRouter()
  const [busy, setBusy]             = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  // rejectingId = the event.id currently showing the rejection reason form
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (events.length === 0) return null

  async function handleApprove(id: string) {
    setBusy(id + ':approve')
    setError(null)
    const r = await approveEvent(id)
    setBusy(null)
    if ('error' in r) { setError(r.error); return }
    router.refresh()
  }

  async function handleRejectConfirm(id: string) {
    setBusy(id + ':reject')
    setError(null)
    const r = await rejectEvent(id, rejectReason)
    setBusy(null)
    if ('error' in r) { setError(r.error); return }
    setRejectingId(null)
    setRejectReason('')
    router.refresh()
  }

  function startReject(id: string) {
    setRejectingId(id)
    setRejectReason('')
    setError(null)
  }

  function cancelReject() {
    setRejectingId(null)
    setRejectReason('')
  }

  const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900'

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
        <Clock size={15} className="text-amber-700 shrink-0" />
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
          Pending Approval
        </p>
        <span className="ml-auto text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
          {events.length}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 px-4 py-2 bg-red-50">{error}</p>
      )}

      <div className="divide-y divide-amber-100">
        {events.map(ev => {
          const approving  = busy === ev.id + ':approve'
          const rejecting  = busy === ev.id + ':reject'
          const isBusy     = approving || rejecting
          const isRejecting = rejectingId === ev.id
          const dispDate   = new Date(ev.starts_at).toLocaleDateString('en-IN', {
            timeZone: IST_TZ, weekday: 'short', day: 'numeric', month: 'short',
          })
          const dispTime   = new Date(ev.starts_at).toLocaleTimeString('en-IN', {
            timeZone: IST_TZ, hour: '2-digit', minute: '2-digit',
          })
          return (
            <div key={ev.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{ev.title}</p>
                  {ev.title_ml && (
                    <p className="text-xs font-malayalam text-muted-foreground" lang="ml">
                      {ev.title_ml}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dispDate}
                    {' \u00b7 '}
                    {dispTime}
                    {ev.venue ? ' \u00b7 ' + ev.venue : ''}
                    {ev.groups ? ' \u00b7 ' + (ev.groups.name_ml ?? ev.groups.name) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(ev.id)}
                    disabled={isBusy || isRejecting}
                    title="Approve"
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 disabled:opacity-50 min-h-[34px] transition-colors"
                  >
                    <CheckCircle size={13} />
                    {approving ? '…' : 'Approve'}
                  </button>
                  {!isRejecting ? (
                    <button
                      onClick={() => startReject(ev.id)}
                      disabled={isBusy}
                      title="Reject"
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-100 disabled:opacity-50 min-h-[34px] transition-colors"
                    >
                      <XCircle size={13} />
                      Reject
                      <ChevronDown size={11} className="opacity-60" />
                    </button>
                  ) : (
                    <button
                      onClick={cancelReject}
                      className="text-xs text-gray-500 hover:text-gray-700 font-semibold px-2.5 py-1.5 min-h-[34px]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection reason form — inline, below the event row */}
              {isRejecting && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
                    Rejection reason (optional)
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Clashes with Holy Qurbana — please reschedule"
                    className={inp + ' resize-none'}
                  />
                  <button
                    onClick={() => handleRejectConfirm(ev.id)}
                    disabled={rejecting}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 disabled:opacity-50 min-h-[36px] transition-colors"
                  >
                    <XCircle size={13} />
                    {rejecting ? 'Rejecting…' : 'Confirm Rejection'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

