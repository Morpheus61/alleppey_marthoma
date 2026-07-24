'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Pencil, X, AlertCircle } from 'lucide-react'
import type { Profile, FamilyMember } from '@/types/database'
import MemberForm from './MemberForm'

interface Props {
  profile: Profile
  action: (fd: FormData) => Promise<{ error: string } | { success: true }>
  onPhotoUpload: (type: 'avatar' | 'family', url: string) => Promise<{ error: string } | { success: true }>
  requestCorrectionAction?: (currentData: Record<string, unknown>, fd: FormData) => Promise<{ error: string } | { success: true }>
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

export default function ProfileCard({ profile, action, onPhotoUpload, requestCorrectionAction }: Props) {
  const [editing, setEditing] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [corrErr, setCorrErr]       = useState<string | null>(null)
  const [corrDone, setCorrDone]     = useState(false)
  const [corrSaving, setCorrSaving] = useState(false)

  const familyMembers = (profile.family_members ?? []) as FamilyMember[]

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide">Edit My Details</h2>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} /> Cancel
          </button>
        </div>
        <MemberForm
          profile={profile}
          action={async (fd) => {
            const result = await action(fd)
            if ('success' in result) setEditing(false)
            return result
          }}
          onPhotoUpload={onPhotoUpload}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Photos + Name header */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden bg-brand-100 border-2 border-amber-200 flex items-center justify-center">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name} width={64} height={64} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-brand-900 font-bold text-2xl">{(profile.full_name?.[0] ?? '?').toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-brand-900 leading-tight">{profile.full_name}</h2>
            {profile.full_name_ml && (
              <p className="font-malayalam text-muted-foreground text-base" lang="ml">{profile.full_name_ml}</p>
            )}
            {profile.house_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.house_name}</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
        </div>

        {/* Family photo */}
        {profile.family_photo_url && (
          <div className="mt-4 rounded-xl overflow-hidden h-36 relative">
            <Image src={profile.family_photo_url} alt="Family photo" fill className="object-cover" unoptimized />
          </div>
        )}
      </div>

      {/* Personal details */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold text-brand-900 uppercase tracking-wide border-b border-amber-50 pb-2">Personal Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : null} />
          <Field label="Address" value={profile.address} />
          <Field label="Mobile" value={profile.phone} />
          {profile.phone_landline && <Field label="Landline" value={profile.phone_landline} />}
          <Field label="WhatsApp" value={profile.is_mobile_whatsapp ? profile.phone : (profile.whatsapp_number ?? null)} />
          {profile.email && <Field label="Email" value={profile.email} />}
        </div>
      </div>

      {/* Family members */}
      {familyMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-brand-900 uppercase tracking-wide border-b border-amber-50 pb-2">Family Members ({familyMembers.length})</p>
          <div className="space-y-2">
            {familyMembers.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-50 border border-amber-100 flex items-center justify-center text-brand-900 font-bold text-sm shrink-0">
                  {(m.name ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.relation ?? '—'}
                    {m.dob ? ` · ${new Date(m.dob).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {familyMembers.length === 0 && !profile.address && !profile.date_of_birth && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Pencil size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Profile incomplete</p>
            <p className="text-xs text-amber-700 mt-0.5">Tap <strong>Edit</strong> above to add your address, date of birth, and family members.</p>
          </div>
        </div>
      )}

      {/* Request a Correction — for name / DOB changes that need Vicar approval */}
      {requestCorrectionAction && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-brand-900 uppercase tracking-wide">Request a Correction</p>
            {correcting && (
              <button onClick={() => { setCorrecting(false); setCorrErr(null) }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X size={13} /> Cancel
              </button>
            )}
          </div>

          {!correcting && !corrDone && (
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">
                  If your name or date of birth is incorrect, submit a correction request. The office will review it and the Vicar will confirm the change.
                </p>
                <button
                  onClick={() => setCorrecting(true)}
                  className="mt-2 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
                >
                  Request a Correction
                </button>
              </div>
            </div>
          )}

          {corrDone && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Correction request submitted. The office will review it shortly.
            </p>
          )}

          {correcting && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setCorrErr(null)
                setCorrSaving(true)
                const fd = new FormData(e.currentTarget)
                const currentData = {
                  full_name:     profile.full_name,
                  full_name_ml:  profile.full_name_ml,
                  date_of_birth: profile.date_of_birth,
                }
                const result = await requestCorrectionAction(currentData, fd)
                setCorrSaving(false)
                if ('error' in result) { setCorrErr(result.error); return }
                setCorrecting(false)
                setCorrDone(true)
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide block mb-0.5">
                    Correct Full Name (English)
                  </label>
                  <input
                    name="full_name"
                    defaultValue={profile.full_name}
                    required
                    className="w-full rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide block mb-0.5">
                    Correct Full Name (Malayalam)
                  </label>
                  <input
                    name="full_name_ml"
                    defaultValue={profile.full_name_ml ?? ''}
                    className="w-full rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm font-malayalam focus:outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide block mb-0.5">
                    Correct Date of Birth
                  </label>
                  <input
                    name="date_of_birth"
                    type="date"
                    defaultValue={profile.date_of_birth ?? ''}
                    className="w-full rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide block mb-0.5">
                    Notes (optional)
                  </label>
                  <input
                    name="notes"
                    placeholder="e.g. Spelling correction, wrong year…"
                    className="w-full rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
                  />
                </div>
              </div>

              {corrErr && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{corrErr}</p>
              )}

              <button
                type="submit"
                disabled={corrSaving}
                className="w-full bg-brand-900 text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                {corrSaving ? 'Submitting…' : 'Submit Correction Request'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
