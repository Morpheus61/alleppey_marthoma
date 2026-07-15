'use client'

import { useState } from 'react'
import type { Profile, FamilyMember } from '@/types/database'
import { PlusCircle, Trash2 } from 'lucide-react'

interface Props {
  profile: Profile
  action: (formData: FormData) => Promise<void>
  adminMode?: boolean
}

const field = 'w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400 shadow-sm'
const label = 'block text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1'
const section = 'space-y-4'

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandchild', 'Other']

export default function MemberForm({ profile, action, adminMode = false }: Props) {
  const [isMobileWA, setIsMobileWA] = useState(profile.is_mobile_whatsapp ?? true)
  const [family, setFamily] = useState<FamilyMember[]>(
    profile.family_members?.length ? profile.family_members : []
  )
  const [saved, setSaved] = useState(false)

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
    const fd = new FormData(e.currentTarget)
    // Inject dynamic family members
    fd.delete('fm_name'); fd.delete('fm_dob'); fd.delete('fm_relation')
    family.forEach(m => {
      fd.append('fm_name',     m.name ?? '')
      fd.append('fm_dob',      m.dob  ?? '')
      fd.append('fm_relation', m.relation ?? '')
    })
    await action(fd)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Personal Details ── */}
      <div className={section}>
        <p className="text-base font-bold text-brand-900 border-b border-amber-100 pb-2">👤 Personal Details</p>

        <div>
          <label className={label}>Full Name</label>
          <input name="full_name" required defaultValue={profile.full_name} placeholder="e.g. Thomas Varughese" className={field} />
        </div>

        <div>
          <label className={label}>Full Name in Malayalam</label>
          <input name="full_name_ml" defaultValue={profile.full_name_ml ?? ''} placeholder="e.g. തോമസ് വറുഗീസ്" className={`${field} font-malayalam`} lang="ml" />
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
          <p className="text-xs text-muted-foreground mt-1">Your registered mobile number — contact admin to change</p>
        </div>

        <div>
          <label className={label}>Is this mobile number also on WhatsApp?</label>
          <div className="flex gap-3 mt-1">
            {[{val:'yes',label:'Yes, same number'},{val:'no',label:'No, different number'}].map(opt => (
              <label key={opt.val} className={`flex-1 flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${isMobileWA === (opt.val==='yes') ? 'border-brand-900 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                <input type="radio" name="is_mobile_whatsapp" value={opt.val}
                  checked={isMobileWA === (opt.val === 'yes')}
                  onChange={() => setIsMobileWA(opt.val === 'yes')}
                  className="accent-brand-900" />
                <span className="text-sm">{opt.label}</span>
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
          <div key={i} className="rounded-xl border border-amber-100 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-900">Member {i + 1}</p>
              <button type="button" onClick={() => removeFamilyMember(i)} className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            <input
              value={m.name ?? ''} onChange={e => updateMember(i, 'name', e.target.value)}
              placeholder="Full name" className={field} required={false}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Date of Birth</label>
                <input type="date" value={m.dob ?? ''} onChange={e => updateMember(i, 'dob', e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Relation</label>
                <select value={m.relation ?? ''} onChange={e => updateMember(i, 'relation', e.target.value)} className={field}>
                  <option value="">Select…</option>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addFamilyMember}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-200 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
          <PlusCircle size={18} /> Add Family Member
        </button>
      </div>

      {/* ── Admin status (admin only) ── */}
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
      <div className="sticky bottom-20 pb-2">
        <button type="submit" className="w-full bg-brand-900 text-white font-bold rounded-xl py-4 text-sm hover:bg-brand-800 transition-colors shadow-lg">
          {saved ? '✓ Saved!' : 'Save Details'}
        </button>
        {saved && <p className="text-center text-xs text-green-600 mt-2">Your details have been saved successfully.</p>}
      </div>

    </form>
  )
}
