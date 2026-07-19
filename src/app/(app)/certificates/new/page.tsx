'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MemberSearch from '@/components/certificates/MemberSearch'
import SignatureCapture from '@/components/certificates/SignatureCapture'
import { createCertificateRequest, getNextCertNo, uploadSignature } from '@/lib/certificates/queries'
import { resolveFather, resolveMother } from '@/lib/certificates/types'
import type { MemberRecord, CertType } from '@/lib/certificates/types'

// ── Certificate types ──────────────────────────────────────────────────────

const CERT_TYPES: { id: CertType; label: string; icon: string }[] = [
  { id: 'baptism',      label: 'Holy Baptism',    icon: '💧' },
  { id: 'communion',    label: 'First Communion',  icon: '🍞' },
  { id: 'confirmation', label: 'Confirmation',     icon: '✝️' },
  { id: 'matrimony',    label: 'Holy Matrimony',   icon: '💍' },
  { id: 'membership',   label: 'Membership',       icon: '📋' },
  { id: 'transfer',     label: 'Transfer',         icon: '🏛️' },
]

// ── Per-type extra fields ───────────────────────────────────────────────────

type ExtraFieldDef = { key: string; label: string; placeholder?: string; required?: boolean }

const EXTRA_FIELDS: Record<CertType, ExtraFieldDef[]> = {
  baptism: [
    { key: 'baptismDate', label: 'Date of Baptism', required: true },
    { key: 'vicar',       label: 'Officiating Vicar', required: true },
  ],
  communion: [
    { key: 'communionDate', label: 'Date of First Communion', required: true },
    { key: 'registerNo',    label: 'Register No' },
    { key: 'vicar',         label: 'Officiating Vicar', required: true },
  ],
  confirmation: [
    { key: 'confirmationDate', label: 'Date of Confirmation', required: true },
    { key: 'vicar',            label: 'Officiating Vicar / Bishop', required: true },
  ],
  matrimony: [
    { key: 'groomName',    label: "Groom's Full Name",   required: true },
    { key: 'groomFather',  label: "Groom's Father" },
    { key: 'groomAddress', label: "Groom's Address" },
    { key: 'brideName',    label: "Bride's Full Name",   required: true },
    { key: 'brideFather',  label: "Bride's Father" },
    { key: 'brideAddress', label: "Bride's Address" },
    { key: 'marriageDate', label: 'Date of Marriage',    required: true },
    { key: 'vicar',        label: 'Officiating Vicar',   required: true },
    { key: 'witness1',     label: 'Witness 1' },
    { key: 'witness2',     label: 'Witness 2' },
    { key: 'registerNo',   label: 'Marriage Register No' },
  ],
  membership: [
    { key: 'purpose', label: 'Purpose (immigration, employment…)', required: true },
    { key: 'vicar',   label: 'Vicar', required: true },
  ],
  transfer: [
    { key: 'receivingParish', label: 'Receiving Parish',  required: true },
    { key: 'transferDate',    label: 'Effective Date',     required: true },
    { key: 'vicar',           label: 'Vicar',              required: true },
  ],
}

// ── Component ──────────────────────────────────────────────────────────────

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white'

export default function NewCertificatePage() {
  const router = useRouter()
  const [member,    setMember]    = useState<MemberRecord | null>(null)
  const [certType,  setCertType]  = useState<CertType>('baptism')
  const [extras,    setExtras]    = useState<Record<string, string>>({})
  const [certNo,    setCertNo]    = useState('')
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null)
  const [sigType,   setSigType]   = useState<'drawn' | 'uploaded'>('drawn')
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [vicarNameSetting, setVicarNameSetting] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }
      setCurrentUserId(session.user.id)
      // Fetch the current Vicar name from parish_roles (super_admin, not revoked)
      const { data: roleRow } = await supabase
        .from('parish_roles')
        .select('profiles!profile_id(full_name)')
        .eq('role', 'super_admin')
        .is('revoked_at', null)
        .maybeSingle()
      const vicar = (roleRow as unknown as { profiles: { full_name: string } | null } | null)
        ?.profiles?.full_name ?? ''
      setVicarNameSetting(vicar)
    }
    init()
  }, [router])

  // Auto-generate cert number when member + type are chosen
  useEffect(() => {
    if (member && certType) {
      getNextCertNo(certType).then(setCertNo).catch(() => {})
    }
  }, [member, certType])

  const handleMemberSelect = (m: MemberRecord) => {
    setMember(m)
    setStep(2)
  }

  const handleTypeSelect = (t: CertType) => {
    setCertType(t)
    // Reset extras for the new type; pre-fill vicar from app_settings if set
    setExtras(vicarNameSetting ? { vicar: vicarNameSetting } : {})
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!member || !currentUserId) return
    // Validate required fields
    const required = EXTRA_FIELDS[certType].filter(f => f.required).map(f => f.key)
    const missing  = required.filter(k => !extras[k]?.trim())
    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let sigUrl: string | undefined
      if (sigDataUrl) {
        const fileName = `secretary_${currentUserId}_${Date.now()}.png`
        sigUrl = await uploadSignature(sigDataUrl, fileName)
      }
      const req = await createCertificateRequest({
        cert_type:  certType,
        cert_no:    certNo,
        member_id:  member.id,
        extras,
        created_by: currentUserId,
        secretary_signature_url:  sigUrl,
        secretary_signature_type: sigUrl ? sigType : undefined,
      })
      router.push(`/certificates/${req.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fatherName = member ? resolveFather(member) : null
  const motherName = member ? resolveMother(member) : null

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Certificate Request</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit for Vicar approval. PDF downloads once approved.
        </p>
      </div>

      {/* Step 1 — Member */}
      <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">1. Select Member</p>
        <MemberSearch
          onSelect={handleMemberSelect}
          selected={member}
          onClear={() => { setMember(null); setStep(1) }}
        />
      </section>

      {/* Step 2 — Certificate type */}
      {member && (
        <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">2. Certificate Type</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CERT_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => handleTypeSelect(ct.id)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold text-left transition-colors ${
                  certType === ct.id
                    ? 'bg-brand-900 text-white border-brand-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-200'
                }`}
              >
                <span className="mr-1.5">{ct.icon}</span>{ct.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3 — Ceremony details */}
      {member && step === 3 && (
        <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">3. Ceremony Details</p>

          {/* Pre-fill notice */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-0.5">
            <p className="font-bold">Pre-filled from registry:</p>
            <p>{member.full_name}{member.full_name_ml ? ` (${member.full_name_ml})` : ''}</p>
            {fatherName && fatherName !== '—' && <p>Father: {fatherName}</p>}
            {motherName && motherName !== '—' && <p>Mother: {motherName}</p>}
            {member.house_name && <p>{member.house_name}{member.ward ? ` · ${member.ward}` : ''}</p>}
            {member.baptism_date && <p>Baptised: {member.baptism_date}</p>}
            {member.confirmation_date && <p>Confirmed: {member.confirmation_date}</p>}
          </div>

          {/* Dynamic extra fields */}
          <div className="space-y-3">
            {EXTRA_FIELDS[certType].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                  {f.label}{f.required && ' *'}
                </label>
                <input
                  className={inp}
                  value={extras[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={e => setExtras(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                Certificate No
              </label>
              <input className={inp} value={certNo} onChange={e => setCertNo(e.target.value)} />
            </div>
          </div>

          {/* Secretary signature */}
          <SignatureCapture
            label="Secretary's Signature"
            onCapture={(url, type) => { setSigDataUrl(url); setSigType(type) }}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit for Vicar Approval →'}
          </button>
        </section>
      )}
    </div>
  )
}
