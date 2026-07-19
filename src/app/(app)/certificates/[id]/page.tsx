'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCertificateRequest, deleteCertificateRequest } from '@/lib/certificates/queries'
import { generateCertificatePDF } from '@/components/certificates/PDFGenerator'
import type { CertificateRequest } from '@/lib/certificates/types'
import { IST_TZ } from '@/lib/dates'

const TYPE_LABEL: Record<string, string> = {
  baptism: 'Baptism', communion: 'Communion', confirmation: 'Confirmation',
  matrimony: 'Matrimony', membership: 'Membership', transfer: 'Transfer',
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function CertificateDetailPage() {
  const router = useRouter()
  const { id }  = useParams<{ id: string }>()
  const [req, setReq]             = useState<CertificateRequest | null>(null)
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [vicarName, setVicarName] = useState('')
  const [secretaryName, setSecretaryName] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('is_admin, full_name').eq('id', session.user.id).single()
      setIsAdmin(!!profile?.is_admin)
      setVicarName(profile?.is_admin ? (profile.full_name ?? '') : '')

      const data = await getCertificateRequest(id)
      if (!data) { router.replace('/certificates'); return }
      setReq(data)
      setSecretaryName(data.creator?.full_name ?? '')
      setLoading(false)
    }
    init()
  }, [id, router])

  const handleDelete = async () => {
    if (!confirm('Delete this certificate request? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteCertificateRequest(id)
      router.replace('/certificates')
    } catch (e) {
      console.error('Delete failed', e)
      alert('Failed to delete. Ensure migration 026 has been applied.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = async () => {    if (!req?.member) return
    setDownloading(true)
    try {
      await generateCertificatePDF({
        certType:      req.cert_type,
        certNo:        req.cert_no ?? '',
        member:        req.member,
        extras:        req.extras,
        vicarName:     req.reviewer?.full_name ?? vicarName,
        secretaryName: req.creator?.full_name  ?? secretaryName,
        secretarySigUrl: req.secretary_signature_url,
        vicarSigUrl:     req.vicar_signature_url,
      })
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>
  if (!req)    return null

  const m = req.member

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/certificates" className="text-xs text-muted-foreground hover:text-foreground">← Certificate Log</Link>
          <h1 className="text-xl font-bold text-brand-900 mt-1">
            {TYPE_LABEL[req.cert_type]} Certificate
          </h1>
          <p className="text-sm text-muted-foreground">{req.cert_no}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[req.status]}`}>
            {req.status}
          </span>
          {req.status === 'approved' && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-xs font-semibold bg-brand-900 text-white rounded-xl px-3 py-2 hover:bg-brand-800 disabled:opacity-50 transition-colors"
            >
              {downloading ? 'Generating…' : '⬇ Download PDF'}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold bg-red-700 text-white rounded-xl px-3 py-2 hover:bg-red-800 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Member */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-1">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Member</p>
        <p className="font-bold text-brand-900">{m?.full_name ?? '—'}</p>
        {m?.full_name_ml && <p className="text-sm font-malayalam text-muted-foreground" lang="ml">{m.full_name_ml}</p>}
        <p className="text-xs text-muted-foreground">
          {[m?.house_name, m?.ward, m?.phone].filter(Boolean).join(' · ')}
        </p>
        {m?.address && <p className="text-xs text-muted-foreground">{m.address}</p>}
        {m?.family_register_no && <p className="text-xs text-muted-foreground">Reg: {m.family_register_no}</p>}
      </div>

      {/* Extras */}
      {Object.keys(req.extras).length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-2">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Ceremony Details</p>
          {Object.entries(req.extras).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-muted-foreground capitalize min-w-[120px]">{k.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Submission info */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-1.5">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Submission</p>
        <p className="text-xs text-muted-foreground">
          Submitted by <span className="font-medium text-gray-800">{req.creator?.full_name ?? '—'}</span>
          {' on '}
          {new Date(req.created_at).toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {req.reviewed_by && (
          <p className="text-xs text-muted-foreground">
            {req.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
            <span className="font-medium text-gray-800">{req.reviewer?.full_name ?? '—'}</span>
            {req.reviewed_at && ` on ${new Date(req.reviewed_at).toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
        )}
        {req.rejection_reason && (
          <p className="text-xs text-red-600 mt-1">Reason: {req.rejection_reason}</p>
        )}
      </div>

      {/* Admin: link to approve */}
      {isAdmin && req.status === 'pending' && (
        <Link href="/certificates/approve"
          className="block text-center text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
          Go to Approvals Queue →
        </Link>
      )}
    </div>
  )
}
