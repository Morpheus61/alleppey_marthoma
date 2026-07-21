'use client'

import { useState } from 'react'
import { Search, Home, X, ChevronRight, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adminLinkToExistingMember, adminCreateHouseholdAndLink, adminImportFamilyMembers } from './actions'
import type { ImportRow } from './actions'
import type { ProfileRow } from './types'

// ── Types ──────────────────────────────────────────────────────────────────

interface Household {
  id: string
  house_name: string
  house_name_ml: string | null
  bhagam_name: string
  bhagam_name_ml: string | null
}

interface HouseholdMember {
  id: string
  full_name: string
  full_name_ml: string | null
  relation_to_head: string | null
}

interface ImportRowState {
  selected: boolean
  isDuplicate: boolean
  name: string
  name_ml: string
  relation: string
  dob: string
}

type Step = 'search' | 'pick-action' | 'select-member' | 'create-household' | 'import-jsonb' | 'done'

const RELATIONS = ['head','spouse','son','daughter','father','mother','brother','sister','grandchild','other']

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white placeholder:text-gray-400'
const btn = 'text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[40px] transition-colors disabled:opacity-50'

// ── Component ──────────────────────────────────────────────────────────────

export default function LinkModal({
  profile,
  prayerGroups,
  onClose,
}: {
  profile: ProfileRow
  prayerGroups: { id: string; name: string; name_ml: string | null }[]
  onClose: () => void
}) {
  const [step, setStep]                     = useState<Step>('search')
  const [query, setQuery]                   = useState('')
  const [searchResults, setSearchResults]   = useState<Household[]>([])
  const [searching, setSearching]           = useState(false)
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null)
  const [claimableMembers, setClaimableMembers]   = useState<HouseholdMember[]>([])
  const [linkedFamilyId, setLinkedFamilyId] = useState<string | null>(null)
  const [importRows, setImportRows]         = useState<ImportRowState[]>([])
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [skipped, setSkipped]               = useState<string[]>([])

  // POST-016: prefer display_name; fall back to full_name while legacy columns exist
  const displayName = profile.display_name ?? profile.full_name

  // ── Step handlers ──────────────────────────────────────────────────────

  async function handleSearch(term: string) {
    setQuery(term)
    if (term.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('search_households', { search_term: term.trim() })
    setSearchResults((data as Household[]) ?? [])
    setSearching(false)
  }

  async function handleSelectHousehold(h: Household) {
    setSelectedHousehold(h)
    setError(null)
    // Fetch unlinked (claimable) members — reuses the same RPC as the self-claim flow
    const supabase = createClient()
    const { data } = await supabase.rpc('household_claimable_members', { p_family_id: h.id })
    setClaimableMembers((data as HouseholdMember[]) ?? [])
    setStep('pick-action')
  }

  async function handleLinkToMember(memberId: string) {
    setSaving(true); setError(null)
    const result = await adminLinkToExistingMember(profile.id, memberId)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    await prepareImport(result.familyId)
  }

  async function handleCreateHousehold(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('profile_id', profile.id)
    const result = await adminCreateHouseholdAndLink(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    await prepareImport(result.familyId)
  }

  async function prepareImport(familyId: string) {
    setLinkedFamilyId(familyId)
    const jsonbMembers = profile.family_members ?? []

    if (jsonbMembers.length === 0) {
      setStep('done')
      return
    }

    // Fetch current household members for duplicate detection
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('family_members')
      .select('full_name')
      .eq('family_id', familyId)
    const existingLower = new Set((existing ?? []).map(m => m.full_name.toLowerCase()))

    const rows: ImportRowState[] = jsonbMembers.map(fm => ({
      selected:    !existingLower.has(fm.name.toLowerCase()),
      isDuplicate:  existingLower.has(fm.name.toLowerCase()),
      name:         fm.name,
      name_ml:      fm.name_ml ?? '',
      relation:     fm.relation ?? '',
      dob:          fm.dob ?? '',
    }))
    setImportRows(rows)
    setStep('import-jsonb')
  }

  async function handleImport() {
    const selected = importRows
      .filter(r => r.selected && r.name.trim())
      .map<ImportRow>(r => ({
        name:     r.name.trim(),
        name_ml:  r.name_ml.trim() || null,
        relation: r.relation.trim() || null,
        dob:      r.dob || null,
      }))

    if (selected.length === 0) { setStep('done'); return }

    setSaving(true); setError(null)
    const result = await adminImportFamilyMembers(linkedFamilyId!, selected)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    if (result.skipped.length > 0) setSkipped(result.skipped)
    setStep('done')
  }

  function updateRow(i: number, patch: Partial<ImportRowState>) {
    setImportRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-white">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Linking account</p>
            <p className="font-bold text-sm text-brand-900">{displayName}</p>
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* ── STEP: search ── */}
          {step === 'search' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Search for the household to link this account to.
              </p>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="House name, bhagam\u2026"
                  className={inp + ' pl-9'}
                  autoFocus
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Searching\u2026</p>}
              <div className="space-y-1.5">
                {searchResults.map(h => (
                  <button
                    key={h.id}
                    onClick={() => handleSelectHousehold(h)}
                    className="w-full text-left rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm hover:border-amber-300 hover:shadow-md transition-all"
                  >
                    <p className="font-semibold text-sm">{h.house_name}</p>
                    {h.house_name_ml && (
                      <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{h.house_name_ml}</p>
                    )}
                    <p className="text-xs text-amber-700 mt-0.5">{h.bhagam_name_ml ?? h.bhagam_name}</p>
                  </button>
                ))}
              </div>
              {query.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No households found.</p>
              )}
            </div>
          )}

          {/* ── STEP: pick action ── */}
          {step === 'pick-action' && selectedHousehold && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Home size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{selectedHousehold.house_name}</p>
                  {selectedHousehold.house_name_ml && (
                    <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{selectedHousehold.house_name_ml}</p>
                  )}
                  <p className="text-xs text-amber-700">{selectedHousehold.bhagam_name_ml ?? selectedHousehold.bhagam_name}</p>
                </div>
                <button
                  onClick={() => { setStep('search'); setSelectedHousehold(null) }}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  Change
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setStep('select-member')}
                  disabled={claimableMembers.length === 0}
                  className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-brand-900 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-brand-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Link to existing member</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {claimableMembers.length > 0
                          ? claimableMembers.length + ' unlinked member' + (claimableMembers.length !== 1 ? 's' : '') + ' available'
                          : 'No unlinked members in this household'}
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground shrink-0" />
                  </div>
                </button>
                <button
                  onClick={() => setStep('create-household')}
                  className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-brand-900 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Home size={16} className="text-brand-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Create new household</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Prefilled from profile data; user becomes head</p>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground shrink-0" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: select member ── */}
          {step === 'select-member' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-brand-900">Select the matching family member:</p>
              {claimableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No unlinked members available.
                </p>
              )}
              {claimableMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleLinkToMember(m.id)}
                  disabled={saving}
                  className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-brand-900 hover:shadow-sm disabled:opacity-50 transition-all"
                >
                  <p className="font-semibold text-sm">{m.full_name}</p>
                  {m.full_name_ml && (
                    <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{m.full_name_ml}</p>
                  )}
                  {m.relation_to_head && (
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{m.relation_to_head}</p>
                  )}
                </button>
              ))}
              <button
                onClick={() => setStep('pick-action')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                \u2190 Back
              </button>
            </div>
          )}

          {/* ── STEP: create household ── */}
          {step === 'create-household' && (
            <form onSubmit={handleCreateHousehold} className="space-y-3">
              <p className="text-sm font-medium text-brand-900">New household details:</p>
              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                  House Name *
                </label>
                {/* POST-016: house_name pre-filled from profiles.house_name; after Stage B read from elsewhere */}
                <input
                  name="house_name"
                  required
                  defaultValue={profile.house_name ?? ''}
                  className={inp}
                  placeholder="e.g. Pandampurath"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                  Address
                </label>
                {/* POST-016: address pre-filled from profiles.address */}
                <textarea
                  name="address"
                  defaultValue={profile.address ?? ''}
                  className={inp + ' resize-none'}
                  rows={2}
                  placeholder="Street / village / PIN"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                  Bhagam / Prayer Group
                </label>
                <select name="prayer_group_id" className={inp}>
                  <option value="">— Select bhagam (optional) —</option>
                  {prayerGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name_ml ?? g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className={btn + ' flex-1 bg-brand-900 text-white hover:bg-brand-800'}
                >
                  {saving ? 'Creating\u2026' : 'Create & Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('pick-action')}
                  className={btn + ' bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* ── STEP: import JSONB family members ── */}
          {step === 'import-jsonb' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-brand-900">
                  Import {importRows.length} family member{importRows.length !== 1 ? 's' : ''}?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These were entered by the user on their profile. Review and edit each row.
                  Rows marked &#9888; share a name with an existing household member \u2014
                  they are pre-unchecked to avoid duplicates.
                </p>
              </div>
              <div className="space-y-3">
                {importRows.map((row, i) => (
                  <div
                    key={i}
                    className={
                      'rounded-xl border px-3 py-3 space-y-2 ' +
                      (row.isDuplicate ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={e => updateRow(i, { selected: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700">{row.name}</span>
                      {row.relation && (
                        <span className="text-xs text-muted-foreground capitalize">&middot; {row.relation}</span>
                      )}
                      {row.isDuplicate && (
                        <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          &#9888; possible duplicate
                        </span>
                      )}
                    </div>
                    {row.selected && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Name *</label>
                          <input
                            value={row.name}
                            onChange={e => updateRow(i, { name: e.target.value })}
                            className={inp + ' py-1.5 text-xs'}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">ML Name</label>
                          <input
                            value={row.name_ml}
                            onChange={e => updateRow(i, { name_ml: e.target.value })}
                            className={inp + ' py-1.5 text-xs font-malayalam'}
                            lang="ml"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Relation</label>
                          <select
                            value={row.relation}
                            onChange={e => updateRow(i, { relation: e.target.value })}
                            className={inp + ' py-1.5 text-xs'}
                          >
                            <option value="">Select\u2026</option>
                            {RELATIONS.map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Date of Birth</label>
                          <input
                            type="date"
                            value={row.dob}
                            onChange={e => updateRow(i, { dob: e.target.value })}
                            className={inp + ' py-1.5 text-xs'}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={saving || importRows.every(r => !r.selected)}
                  className={btn + ' flex-1 bg-brand-900 text-white hover:bg-brand-800'}
                >
                  {saving
                    ? 'Importing\u2026'
                    : 'Import ' + importRows.filter(r => r.selected).length + ' selected'}
                </button>
                <button
                  onClick={() => setStep('done')}
                  className={btn + ' bg-gray-100 text-gray-700 hover:bg-gray-200'}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-2xl">
                \u2713
              </div>
              <p className="font-semibold text-brand-900">Account linked successfully</p>
              {skipped.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Skipped {skipped.length} duplicate{skipped.length !== 1 ? 's' : ''}: {skipped.join(', ')}
                </p>
              )}
              <button onClick={onClose} className={btn + ' w-full bg-brand-900 text-white hover:bg-brand-800'}>
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
