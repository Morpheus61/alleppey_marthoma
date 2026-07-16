'use client'
import { useState } from 'react'
import { addFamilyMember, linkProfileToMember } from '../actions'

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white placeholder:text-gray-400'

const RELATIONS = ['head','spouse','son','daughter','father','mother','brother','sister','grandchild','other']

interface Profile { id: string; full_name: string; phone: string }
interface FamilyMember { id: string; full_name: string; full_name_ml: string | null; relation_to_head: string | null; date_of_birth: string | null; gender: string | null; is_deceased: boolean; profile_id: string | null }

export function AddMemberForm({ familyId, profiles }: { familyId: string; profiles: Profile[] }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('family_id', familyId)
    const r = await addFamilyMember(fd)
    setSaving(false)
    if ('error' in r) { setError(r.error); return }
    setSaved(true)
    e.currentTarget.reset()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add Family Member</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Full Name *</label>
          <input name="full_name" required placeholder="English" className={inp} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-semibold text-amber-600 uppercase mb-0.5">Malayalam Name</label>
          <input name="full_name_ml" placeholder="മലയാളം" className={`${inp} font-malayalam`} lang="ml" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Relation</label>
          <select name="relation_to_head" className={inp}>
            <option value="">Select…</option>
            {RELATIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Gender</label>
          <select name="gender" className={inp}>
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Date of Birth</label>
          <input type="date" name="date_of_birth" className={inp} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Link App Account (optional)</label>
          <select name="profile_id" className={inp}>
            <option value="">No linked account</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name} ({p.phone})</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full rounded-xl bg-brand-900 text-white text-xs font-semibold py-2.5 hover:bg-brand-800 disabled:opacity-50 transition-colors">
        {saving ? 'Adding…' : saved ? '✓ Added!' : '+ Add Member'}
      </button>
    </form>
  )
}

export function LinkProfileButton({ memberId, memberName, profiles }: { memberId: string; memberName: string; profiles: Profile[] }) {
  const [open, setOpen] = useState(false)
  const [profileId, setProfileId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleLink() {
    if (!profileId) return
    setSaving(true)
    await linkProfileToMember(memberId, profileId)
    setSaving(false)
    setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-[10px] text-amber-600 underline hover:text-amber-800">
      Link account
    </button>
  )

  return (
    <div className="flex gap-2 mt-1">
      <select value={profileId} onChange={e => setProfileId(e.target.value)}
        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-900">
        <option value="">Select member account…</option>
        {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.phone})</option>)}
      </select>
      <button onClick={handleLink} disabled={!profileId || saving}
        className="rounded-lg bg-brand-900 text-white text-xs px-3 py-1 hover:bg-brand-800 disabled:opacity-50">
        {saving ? '…' : 'Link'}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
    </div>
  )
}
