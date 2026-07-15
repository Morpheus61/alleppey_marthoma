'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, FamilyMember } from '@/types/database'
import { PlusCircle, Trash2, Languages, AlertTriangle } from 'lucide-react'

interface Props {
  profile: Profile
  action: (formData: FormData) => Promise<{ error: string } | { success: true }>
  adminMode?: boolean
}

const field = 'w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400 shadow-sm'
const label = 'block text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1'
const section = 'space-y-4'

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandchild', 'Other']

async function transliterate(text: string): Promise<string> {
  if (!text.trim()) return ''
  const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`)
  const json = await res.json()
  return json.result ?? ''
}

/** Small button that transliterates the source input into the target input */
function TransliterateButton({
  sourceRef,
  onResult,
}: {
  sourceRef: React.RefObject<HTMLInputElement>
  onResult: (val: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    const text = sourceRef.current?.value ?? ''
    if (!text) return
    setLoading(true)
    const result = await transliterate(text)
    if (result) onResult(result)
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      title="Auto-transliterate to Malayalam"
      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
    >
      <Languages size={14} />
      {loading ? 'Transliterating…' : 'Type → മലയാളം'}
    </button>
  )
}

export default function MemberForm({ profile, action, adminMode = false }: Props) {
  const router = useRouter()
  const [isMobileWA, setIsMobileWA] = useState(profile.is_mobile_whatsapp ?? true)
  const [family, setFamily] = useState<FamilyMember[]>(
    profile.family_members?.length ? profile.family_members : []
  )
  const [fullNameMl, setFullNameMl] = useState(profile.full_name_ml ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs for transliteration source
  const fullNameRef = useRef<HTMLInputElement>(null)

  function addFamilyMember() {
    setFamily(prev => [...prev, { name: '', dob: null, relation: null }])
  }

  function removeFamilyMember(i: number) {
    setFamily(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateMember(i: number, key: keyof FamilyMember, value: string) {
    setFamily(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: value || null } : m))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('full_name_ml', fullNameMl)
    fd.delete('fm_name'); fd.delete('fm_dob'); fd.delete('fm_relation')
    family.forEach(m => {
      fd.append('fm_name',     m.name ?? '')
      fd.append('fm_dob',      m.dob  ?? '')
      fd.append('fm_relation', m.relation ?? '')
    })
    const result = await action(fd)
    setSaving(false)
    if (result && 'error' in result) {
      setSaveError(result.error)
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Personal Details ── */}
      <div className={section}>
        <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">👤 Personal Details</p>

        <div>
          <label className={label}>Full Name</label>
          <input
            ref={fullNameRef}
            name="full_name"
            required
            defaultValue={profile.full_name}
            placeholder="e.g. Thomas Varughese"
            className={field}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={label} style={{marginBottom:0}}>Full Name in Malayalam</label>
            <TransliterateButton
              sourceRef={fullNameRef as React.RefObject<HTMLInputElement>}
              onResult={setFullNameMl}
            />
          </div>
          <input
            name="full_name_ml"
            value={fullNameMl}
            onChange={e => setFullNameMl(e.target.value)}
            placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക — അല്ലെങ്കിൽ മുകളിൽ ബട്ടൺ അമർത്തുക"
            className={`${field} font-malayalam`}
            lang="ml"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Tip: Type the English name above, then press <strong>&quot;Type → മലയാളം&quot;</strong> to auto-convert.
            You can then edit it if needed.
          </p>
        </div>

        <div>
          <label className={label}>Date of Birth</label>
          <input type="date" name="date_of_birth" defaultValue={profile.date_of_birth ?? ''} className={field} />
        </div>
      </div>

      {/* ── Family / House ── */}
      <div className={section}>
        <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">🏠 Family / House</p>

        <div>
          <label className={label}>Family / House Name</label>
          <input name="house_name" defaultValue={profile.house_name ?? ''} placeholder="e.g. Parayil House" className={field} />
          <p className="text-xs text-muted-foreground mt-1">The traditional family or house name (kutumba peru)</p>
        </div>

        <div>
          <label className={label}>Address</label>
          <textarea name="address" defaultValue={profile.address ?? ''} rows={3}
            placeholder="House No., Street, Ward, Alappuzha — 688001"
            className={`${field} resize-none`} />
        </div>
      </div>

      {/* ── Contact Details ── */}
      <div className={section}>
        <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">📞 Contact Details</p>

        <div>
          <label className={label}>Mobile Number</label>
          <input name="mobile" defaultValue={profile.phone} disabled
            className={`${field} bg-gray-50 text-gray-500 cursor-not-allowed`} />
          <p className="text-xs text-muted-foreground mt-1">Your registered mobile — contact admin to change</p>
        </div>

        <div>
          <label className={label}>Is this mobile number also on WhatsApp?</label>
          <div className="flex gap-3 mt-1">
            {[{val:'yes',label:'Yes, same number'},{val:'no',label:'No, different number'}].map(opt => (
              <label key={opt.val} className={`flex-1 flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer transition-colors text-sm ${isMobileWA === (opt.val==='yes') ? 'border-brand-900 bg-brand-50 font-medium' : 'border-gray-200 bg-white'}`}>
                <input type="radio" name="is_mobile_whatsapp" value={opt.val}
                  checked={isMobileWA === (opt.val === 'yes')}
                  onChange={() => setIsMobileWA(opt.val === 'yes')}
                  className="accent-brand-900" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {!isMobileWA && (
          <div>
            <label className={label}>WhatsApp Number</label>
            <input name="whatsapp_number" defaultValue={profile.whatsapp_number ?? ''} placeholder="10-digit WhatsApp number" className={field} />
          </div>
        )}

        <div>
          <label className={label}>Landline Number <span className="normal-case font-normal text-gray-400">(optional)</span></label>
          <input name="phone_landline" defaultValue={profile.phone_landline ?? ''} placeholder="e.g. 0477-2251234" className={field} />
        </div>

        <div>
          <label className={label}>Email Address <span className="normal-case font-normal text-gray-400">(optional)</span></label>
          <input type="email" name="email" defaultValue={profile.email ?? ''} placeholder="e.g. thomas@example.com" className={field} />
        </div>
      </div>

      {/* ── Family Members ── */}
      <div className={section}>
        <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">👨‍👩‍👧‍👦 Family Members</p>
        <p className="text-xs text-muted-foreground">List everyone living in your household — spouse, children, parents</p>

        {family.map((m, i) => (
          <FamilyMemberRow
            key={i}
            index={i}
            member={m}
            onChange={updateMember}
            onRemove={removeFamilyMember}
            field={field}
            label={label}
          />
        ))}

        <button type="button" onClick={addFamilyMember}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-200 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
          <PlusCircle size={18} /> Add Family Member
        </button>
      </div>

      {/* ── Admin Controls ── */}
      {adminMode && (
        <div className={section}>
          <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">⚙️ Admin Controls</p>
          <div>
            <label className={label}>Account Status</label>
            <select name="status" defaultValue={profile.status} className={field}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="pt-2 pb-4">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-900 text-white font-bold rounded-xl py-4 text-sm hover:bg-brand-800 disabled:opacity-60 transition-colors shadow-md"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Details'}
        </button>
        {saved && (
          <p className="text-center text-xs text-green-600 mt-2 font-medium">
            ✓ Your details have been saved successfully.
          </p>
        )}
        {saveError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mt-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Save failed</p>
              <p className="text-xs text-red-600 mt-0.5 font-mono break-all">{saveError}</p>
              <p className="text-xs text-red-500 mt-1">Please screenshot this error and send it to the App Admin.</p>
            </div>
          </div>
        )}
      </div>

    </form>
  )
}

/** Extracted to its own component so each row has its own transliteration ref */
function FamilyMemberRow({
  index, member, onChange, onRemove, field, label,
}: {
  index: number
  member: FamilyMember
  onChange: (i: number, key: keyof FamilyMember, value: string) => void
  onRemove: (i: number) => void
  field: string
  label: string
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [nameMl, setNameMl] = useState(member.name_ml ?? '')

  return (
    <div className="rounded-xl border border-amber-100 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-900">Member {index + 1}</p>
        <button type="button" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div>
        <label className={label}>Full Name</label>
        <input
          ref={nameRef}
          value={member.name ?? ''}
          onChange={e => onChange(index, 'name', e.target.value)}
          placeholder="Full name (English)"
          className={field}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={label} style={{marginBottom:0}}>Name in Malayalam</label>
          <TransliterateButton
            sourceRef={nameRef as React.RefObject<HTMLInputElement>}
            onResult={val => { setNameMl(val); onChange(index, 'name_ml', val) }}
          />
        </div>
        <input
          value={nameMl}
          onChange={e => { setNameMl(e.target.value); onChange(index, 'name_ml', e.target.value) }}
          placeholder="മലയാളം നാമം"
          className={`${field} font-malayalam`}
          lang="ml"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Date of Birth</label>
          <input
            type="date"
            value={member.dob ?? ''}
            onChange={e => onChange(index, 'dob', e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Relation</label>
          <select
            value={member.relation ?? ''}
            onChange={e => onChange(index, 'relation', e.target.value)}
            className={field}
          >
            <option value="">Select…</option>
            {['Spouse','Son','Daughter','Father','Mother','Brother','Sister','Grandchild','Other'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}


