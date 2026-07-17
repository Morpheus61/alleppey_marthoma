'use client'
import { useState } from 'react'
import { addFamilyMember, linkProfileToMember, addMembersToGroup } from '../actions'

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white placeholder:text-gray-400'

const RELATIONS = ['head','spouse','son','daughter','father','mother','brother','sister','grandchild','other']

interface Profile { id: string; full_name: string; phone: string }
interface FamilyMember { id: string; full_name: string; full_name_ml: string | null; relation_to_head: string | null; date_of_birth: string | null; gender: string | null; is_deceased: boolean; profile_id: string | null }
interface Group { id: string; name: string; name_ml: string | null; group_type: string }

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
        <option value="">Confirm Member Account</option>
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

/** Enrol selected family members into any group */
export function GroupEnrollForm({
  linkedMembers,
  groups,
}: {
  linkedMembers: { id: string; full_name: string; profile_id: string | null }[]
  groups: Group[]
}) {
  const enrollable = linkedMembers.filter(m => m.profile_id)
  const [groupId, setGroupId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(profileId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(profileId) ? next.delete(profileId) : next.add(profileId)
      return next
    })
  }

  async function handleEnrol() {
    if (!groupId) { setError('Choose a group first.'); return }
    if (!selected.size) { setError('Select at least one person.'); return }
    setSaving(true); setError(null)
    const result = await addMembersToGroup(groupId, [...selected])
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setSaved(true)
    setSelected(new Set())
    setGroupId('')
    setTimeout(() => setSaved(false), 2500)
  }

  if (enrollable.length === 0) return null

  const functional = groups.filter(g => g.group_type !== 'prayer')

  return (
    <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-4">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add to a Group</p>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Members can belong to multiple groups. Prayer group (Bhagam) is set at household level and not shown here.
      </p>

      {/* Group selector — prayer groups excluded (geographic, set at household level) */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Group</label>
        <select value={groupId} onChange={e => setGroupId(e.target.value)} className={inp}>
          <option value="">Select group…</option>
          {functional.map(g => (
            <option key={g.id} value={g.id}>{g.name_ml ? `${g.name_ml} — ` : ''}{g.name}</option>
          ))}
        </select>
      </div>

      {/* Member checkboxes */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Which family members?</label>
        <div className="space-y-1.5">
          {enrollable.map(m => (
            <label key={m.profile_id!} className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-gray-100 px-3 py-2 hover:bg-amber-50 transition-colors select-none">
              <input
                type="checkbox"
                checked={selected.has(m.profile_id!)}
                onChange={() => toggle(m.profile_id!)}
                className="accent-brand-900"
              />
              <span className="text-sm font-medium">{m.full_name}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={handleEnrol} disabled={saving}
        className="w-full rounded-xl bg-brand-900 text-white text-xs font-semibold py-2.5 hover:bg-brand-800 disabled:opacity-50 transition-colors">
        {saving ? 'Adding to group…' : saved ? '✓ Added!' : 'Add Selected to Group →'}
      </button>
    </div>
  )
}
