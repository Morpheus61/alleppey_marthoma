'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  getPendingRequests, approveRequest, rejectRequest, uploadSignature,
} from '@/lib/certificates/queries'
import { generateCertificatePDF } from '@/components/certificates/PDFGenerator'
import SignatureCapture from '@/components/certificates/SignatureCapture'
import type { CertificateRequest } from '@/lib/certificates/types'
import { IST_TZ } from '@/lib/dates'

const TYPE_LABEL: Record<string, string> = {
  baptism: 'Baptism', communion: 'Communion', confirmation: 'Confirmation',
  matrimony: 'Matrimony', membership: 'Membership', transfer: 'Transfer',
}

export default function ApprovalQueuePage() {
  const router = useRouter()
  const [requests,      setRequests]      = useState<CertificateRequest[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState<string | null>(null)
  const [vicarSig,      setVicarSig]      = useState<string | null>(null)
  const [vicarSigType,  setVicarSigType]  = useState<'drawn' | 'uploaded'>('drawn')
  const [rejectReason,  setRejectReason]  = useState('')
  const [processing,    setProcessing]    = useState(false)
  const [currentUser,   setCurrentUser]   = useState<{ id: string; full_name: string; is_admin: boolean } | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('id, full_name, is_admin').eq('id', session.user.id).single()
      if (!profile?.is_admin) { router.replace('/certificates'); return }
      setCurrentUser(profile)
      setRequests(await getPendingRequests())
      setLoading(false)
    }
    init()
  }, [router])

  const handleApprove = async (req: CertificateRequest) => {
    if (!currentUser) return
    setProcessing(true)
    try {
      let vicarSigUrl: string | undefined
      if (vicarSig) {
        const fileName = `vicar_${currentUser.id}_${Date.now()}.png`
        vicarSigUrl = await uploadSignature(vicarSig, fileName)
      }
      await approveRequest(req.id, currentUser.id, vicarSigUrl, vicarSigType)

      // Generate PDF immediately
      if (req.member) {
        await generateCertificatePDF({
          certType:      req.cert_type,
          certNo:        req.cert_no ?? '',
          member:        req.member,
          extras:        req.extras,
          vicarName:     currentUser.full_name,
          secretaryName: req.creator?.full_name ?? '',
          secretarySigUrl: req.secretary_signature_url,
          vicarSigUrl:     vicarSigUrl ?? null,
        })
      }

      setRequests(prev => prev.filter(r => r.id !== req.id))
      setSelected(null)
      setVicarSig(null)
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (req: CertificateRequest) => {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return }
    if (!currentUser) return
    setProcessing(true)
    try {
      await rejectRequest(req.id, currentUser.id, rejectReason)
      setRequests(prev => prev.filter(r => r.id !== req.id))
      setSelected(null)
      setRejectReason('')
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/certificates" className="text-xs text-muted-foreground hover:text-foreground">← Certificate Log</Link>
          <h1 className="text-2xl font-bold text-brand-900 mt-1">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/certificates/new"
          className="text-xs font-semibold bg-brand-900 text-white rounded-xl px-3 py-2 hover:bg-brand-800 transition-colors">
          + New
        </Link>
      </div>

      {requests.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          ✓ No pending requests. All clear.
        </div>
      )}

      <div className="space-y-3">
        {requests.map(req => {
          const isOpen = selected === req.id
          return (
            <div key={req.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-brand-900 text-sm">{req.member?.full_name ?? '—'}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                        {TYPE_LABEL[req.cert_type] ?? req.cert_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.cert_no} · By {req.creator?.full_name ?? '—'}
                      {' · '}
                      {new Date(req.created_at).toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {Object.keys(req.extras).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {Object.entries(req.extras).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(isOpen ? null : req.id)}
                    className="shrink-0 text-xs font-semibold text-brand-700 border border-brand-200 rounded-xl px-3 py-1.5 hover:bg-brand-50 transition-colors"
                  >
                    {isOpen ? 'Close ↑' : 'Review ↓'}
                  </button>
                </div>
              </div>

              {/* Expanded review panel */}
              {isOpen && (
                <div className="border-t border-amber-50 px-4 py-4 space-y-4 bg-amber-50/40">
                  {/* Extras summary */}
                  {Object.keys(req.extras).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Details</p>
                      {Object.entries(req.extras).map(([k, v]) => (
                        <p key={k} className="text-xs">
                          <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                          <span className="font-medium">{v}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Vicar signature */}
                  <SignatureCapture
                    label="Vicar's Signature (approving)"
                    onCapture={(url, type) => { setVicarSig(url); setVicarSigType(type) }}
                  />

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing}
                      className="w-full rounded-xl bg-green-600 text-white text-sm font-semibold py-3 hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {processing ? 'Processing…' : '✓ Approve & Download PDF'}
                    </button>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Rejection reason (required)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                      />
                      <button
                        onClick={() => handleReject(req)}
                        disabled={processing}
                        className="w-full rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold py-2.5 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
