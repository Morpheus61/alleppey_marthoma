'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getAllRequests } from '@/lib/certificates/queries'
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

export default function CertificatesPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<CertificateRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', session.user.id).single()
      setIsAdmin(!!profile?.is_admin)
      setRequests(await getAllRequests())
      setLoading(false)
    }
    init()
  }, [router])

  return (
    <div className="max-w-lg md:max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Certificate Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {requests.length} certificate request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href="/certificates/approve"
              className="text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-200 transition-colors">
              Approvals Queue
            </Link>
          )}
          <Link href="/certificates/new"
            className="text-xs font-semibold bg-brand-900 text-white rounded-xl px-3 py-2 hover:bg-brand-800 transition-colors">
            + New Certificate
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">No certificates yet.</p>
      )}

      <div className="space-y-2">
        {requests.map(req => (
          <Link key={req.id} href={`/certificates/${req.id}`}
            className="block bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-brand-900">
                    {req.member?.full_name ?? '—'}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                    {TYPE_LABEL[req.cert_type] ?? req.cert_type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.cert_no ?? '—'}
                  {req.creator?.full_name ? ` · By ${req.creator.full_name}` : ''}
                  {' · '}
                  {new Date(req.created_at).toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[req.status]}`}>
                {req.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
