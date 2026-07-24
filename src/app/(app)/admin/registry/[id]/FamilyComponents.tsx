'use client'
import { useState, useRef } from 'react'
import { addFamilyMember, linkProfileToMember, addMembersToGroup, updateHouseholdPrayerGroup, setMemberGroupMemberships, unlinkProfileFromMember, addLifeEvent, requestRegistryCorrection } from '../actions'

async function transliterate(text: string): Promise<string> {
  if (!text.trim()) return ''
  const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`)
  const json = await res.json()
  return json.result ?? ''
}

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white placeholder:text-gray-400'

const RELATIONS = ['head','spouse','son','daughter','daughter-in-law','father','mother','brother','sister','grandchild','other']

interface Profile { id: string; full_name: string; phone: string }
interface FamilyMember { id: string; full_name: string; full_name_ml: string | null; relation_to_head: string | null; date_of_birth: string | null; gender: string | null; is_deceased: boolean; profile_id: string | null }
interface Group { id: string; name: string; name_ml: string | null; group_type: string }

export function AddMemberForm({ familyId, profiles }: { familyId: string; profiles: Profile[] }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameEnRef = useRef<HTMLInputElement>(null)
  const [fullNameMl, setFullNameMl] = useState('')
  const [mlLoading, setMlLoading] = useState(false)

  async function handleTransliterate() {
    const text = nameEnRef.current?.value ?? ''
    if (!text) return
    setMlLoading(true)
    const result = await transliterate(text)
    if (result) setFullNameMl(result)
    setMlLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('family_id', familyId)
    fd.set('full_name_ml', fullNameMl)
    const r = await addFamilyMember(fd)
    setSaving(false)
    if ('error' in r) { setError(r.error); return }
    setSaved(true)
    setFullNameMl('')
    e.currentTarget.reset()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add Family Member</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Full Name *</label>
          <input ref={nameEnRef} name="full_name" required placeholder="English" className={inp} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-semibold text-amber-600 uppercase">Malayalam Name</label>
            <button type="button" onClick={handleTransliterate} disabled={mlLoading}
              className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-50">
              {mlLoading ? 'Transliterating…' : 'Type → മലയാളം'}
            </button>
          </div>
          <input name="full_name_ml" value={fullNameMl} onChange={e => setFullNameMl(e.target.value)}
            placeholder="മലയാളം" className={`${inp} font-malayalam`} lang="ml" />
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
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Mobile / WhatsApp</label>
          <input name="phone" type="tel" placeholder="+91 XXXXX XXXXX" className={inp} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Email (optional)</label>
          <input name="email" type="email" placeholder="name@example.com" className={inp} />
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

  if (profiles.length === 0) return (
    <div className="mt-1 flex items-center gap-2">
      <span className="text-[10px] text-gray-400 italic">No registered accounts yet — member must sign up first</span>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
    </div>
  )

  return (
    <div className="flex gap-2 mt-1">
      <select value={profileId} onChange={e => setProfileId(e.target.value)}
        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-900">
        <option value="">Select account…</option>
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

/** Remove a profile link from a family member */
export function UnlinkButton({ memberId, familyId }: { memberId: string; familyId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleUnlink() {
    setLoading(true)
    await unlinkProfileFromMember(memberId, familyId)
    setLoading(false)
  }

  if (!confirming) return (
    <button onClick={() => setConfirming(true)} title="Unlink this account"
      className="ml-1 text-[10px] text-red-300 hover:text-red-600 transition-colors">✕</button>
  )

  return (
    <span className="text-[10px] text-red-600 ml-1">
      Unlink?{' '}
      <button onClick={handleUnlink} disabled={loading} className="underline font-semibold">Yes</button>
      {' '}
      <button onClick={() => setConfirming(false)} className="text-gray-400 underline">No</button>
    </span>
  )
}

/** Life events list + inline add form for a single family member */
export function MemberLifeEvents({
  memberId,
  events,
  eventTypes,
}: {
  memberId: string
  events: { id: string; event_date: string | null; life_event_type_id: string | null; event_type: string | null }[]
  eventTypes: { id: string; name: string; name_ml: string | null }[]
}) {
  const [adding, setAdding] = useState(false)
  const [typeId, setTypeId] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!typeId) { setError('Select an event type'); return }
    setSaving(true); setError(null)
    const result = await addLifeEvent(memberId, typeId, date || null, notes || null)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setAdding(false); setTypeId(''); setDate(''); setNotes('')
  }

  const typeName = (id: string | null) =>
    eventTypes.find(t => t.id === id)?.name_ml
    ?? eventTypes.find(t => t.id === id)?.name
    ?? 'Event'

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      {events.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {events.map(e => (
            <span key={e.id} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
              {typeName(e.life_event_type_id) ?? e.event_type ?? 'Event'}
              {e.event_date ? ` · ${new Date(e.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : ''}
            </span>
          ))}
        </div>
      )}
      {!adding ? (
        <button onClick={() => setAdding(true)}
          className="text-[10px] text-blue-600 hover:text-blue-800 underline">+ Life Event</button>
      ) : (
        <div className="space-y-1.5 mt-1">
          <div className="flex gap-2 flex-wrap">
            <select value={typeId} onChange={e => setTypeId(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs">
              <option value="">Event type…</option>
              {eventTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name_ml ? `${t.name_ml} — ` : ''}{t.name}</option>
              ))}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs" />
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
          {error && <p className="text-[10px] text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="rounded-lg bg-brand-900 text-white text-[11px] px-3 py-1 hover:bg-brand-800 disabled:opacity-50">
              {saving ? '…' : 'Add Event'}
            </button>
            <button onClick={() => setAdding(false)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Per-member row with group checkboxes */
function MemberGroupRow({
  member,
  functionalGroups,
  allFunctionalGroupIds,
  initialGroupIds,
}: {
  member: { id: string; full_name: string; relation_to_head: string | null; profile_id: string | null }
  functionalGroups: Group[]
  allFunctionalGroupIds: string[]
  initialGroupIds: Set<string>
}) {
  const [selected, setSelected] = useState<Set<string>>(initialGroupIds)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(groupId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  async function handleSave() {
    if (!member.profile_id) return
    setSaving(true); setError(null)
    const result = await setMemberGroupMemberships(member.profile_id, [...selected], allFunctionalGroupIds)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!member.profile_id) {
    return (
      <div className="rounded-xl border border-gray-100 px-4 py-3 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">{member.full_name}
          <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">{member.relation_to_head ?? '—'}</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 italic">Link an app account to assign to groups</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 px-4 py-3 bg-white space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {member.full_name}
          <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">{member.relation_to_head ?? '—'}</span>
        </p>
        <button onClick={handleSave} disabled={saving}
          className="text-[11px] bg-brand-900 text-white px-3 py-1 rounded-lg hover:bg-brand-800 disabled:opacity-50 shrink-0">
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {functionalGroups.map(g => (
          <label key={g.id} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.has(g.id)}
              onChange={() => toggle(g.id)}
              className="accent-brand-900 w-3.5 h-3.5"
            />
            <span className="text-xs">{g.name_ml ?? g.name}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

/** Prayer-group dropdown (household-level) + per-member functional-group checkboxes */
export function GroupEnrollSection({
  familyId,
  currentPrayerGroupId,
  members,
  functionalGroups,
  prayerGroups,
  currentMemberships,
}: {
  familyId: string
  currentPrayerGroupId: string | null
  members: { id: string; full_name: string; relation_to_head: string | null; profile_id: string | null }[]
  functionalGroups: Group[]
  prayerGroups: Group[]
  currentMemberships: { group_id: string; user_id: string }[]
}) {
  const [prayerGroup, setPrayerGroup] = useState(currentPrayerGroupId ?? '')
  const [prayerSaving, setPrayerSaving] = useState(false)
  const [prayerSaved, setPrayerSaved] = useState(false)
  const [prayerError, setPrayerError] = useState<string | null>(null)

  async function handlePrayerSave() {
    if (!prayerGroup) return
    setPrayerSaving(true); setPrayerError(null)
    const result = await updateHouseholdPrayerGroup(familyId, prayerGroup)
    setPrayerSaving(false)
    if ('error' in result) { setPrayerError(result.error); return }
    setPrayerSaved(true)
    setTimeout(() => setPrayerSaved(false), 2500)
  }

  const allFunctionalGroupIds = functionalGroups.map(g => g.id)

  return (
    <div className="space-y-4">
      {/* ── Bhagam / Prayer Group (household-level dropdown) ── */}
      <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-2">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Bhagam / Prayer Group</p>
        <p className="text-[11px] text-muted-foreground -mt-1">Geographically assigned to the household. One Bhagam per family.</p>
        <div className="flex gap-2">
          <select value={prayerGroup} onChange={e => setPrayerGroup(e.target.value)} className={`${inp} flex-1`}>
            <option value="">Select Bhagam…</option>
            {prayerGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name_ml ? `${g.name_ml} — ` : ''}{g.name}</option>
            ))}
          </select>
          <button onClick={handlePrayerSave} disabled={!prayerGroup || prayerSaving}
            className="rounded-xl bg-brand-900 text-white text-xs px-4 py-2 hover:bg-brand-800 disabled:opacity-50 shrink-0">
            {prayerSaving ? '…' : prayerSaved ? '✓' : 'Update'}
          </button>
        </div>
        {prayerError && <p className="text-xs text-red-600">{prayerError}</p>}
      </div>

      {/* ── Per-member group checkboxes (functional groups only) ── */}
      {functionalGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Group Memberships</p>
          <p className="text-[11px] text-muted-foreground -mt-2">Each member can belong to multiple groups independently.</p>
          <div className="space-y-2">
            {members.map(m => (
              <MemberGroupRow
                key={m.id}
                member={m}
                functionalGroups={functionalGroups}
                allFunctionalGroupIds={allFunctionalGroupIds}
                initialGroupIds={new Set(
                  currentMemberships
                    .filter(cm => cm.user_id === m.profile_id)
                    .map(cm => cm.group_id)
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * HouseholdCorrectionForm
 * Shown to office staff (admin, not super_admin) instead of direct editing.
 * Submits a change_request that the Vicar (super_admin) reviews via /admin/approvals.
 */
export function HouseholdCorrectionForm({
  familyId,
  currentHouseName,
  currentHouseNameMl,
  currentAddress,
  currentPrayerGroupId,
  prayerGroups,
}: {
  familyId: string
  currentHouseName: string
  currentHouseNameMl: string | null
  currentAddress: string | null
  currentPrayerGroupId: string | null
  prayerGroups: { id: string; name: string; name_ml: string | null }[]
}) {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const currentData = {
      house_name:       currentHouseName,
      house_name_ml:    currentHouseNameMl,
      address:          currentAddress,
      prayer_group_id:  currentPrayerGroupId,
    }
    const result = await requestRegistryCorrection('family_units', familyId, currentData, fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setOpen(false)
    setDone(true)
  }

  return (
    <section className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Request Household Correction</p>
        {open && (
          <button onClick={() => { setOpen(false); setError(null) }}
            className="text-xs text-muted-foreground hover:text-foreground">✕ Cancel</button>
        )}
      </div>

      {done && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Correction request submitted. The Vicar will review it in Approvals.
        </p>
      )}

      {!open && !done && (
        <div>
          <p className="text-[11px] text-amber-700 mb-2">
            As office staff, corrections to household name, address, or Bhagam must be approved by the Vicar.
          </p>
          <button onClick={() => setOpen(true)}
            className="text-xs font-semibold bg-amber-700 text-white rounded-lg px-4 py-2 hover:bg-amber-800 transition-colors">
            Submit Correction Request
          </button>
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">House Name (English)</label>
            <input name="house_name" defaultValue={currentHouseName} required
              className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">House Name (Malayalam)</label>
            <input name="house_name_ml" defaultValue={currentHouseNameMl ?? ''} className={inp + ' font-malayalam'} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Address</label>
            <textarea name="address" defaultValue={currentAddress ?? ''} rows={2}
              className={inp + ' resize-none'} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Bhagam / Prayer Group</label>
            <select name="prayer_group_id" defaultValue={currentPrayerGroupId ?? ''} className={inp}>
              <option value="">— No change / Select —</option>
              {prayerGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name_ml ? `${g.name_ml} — ` : ''}{g.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-amber-700 text-white text-xs font-semibold py-2.5 hover:bg-amber-800 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit for Vicar Approval'}
          </button>
        </form>
      )}
    </section>
  )
}
