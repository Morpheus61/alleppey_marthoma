'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, UserPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { createHousehold, createHouseholdWithProfile } from './actions'
import { useRouter } from 'next/navigation'

interface Household {
  id: string; house_name: string; house_name_ml: string | null
  address: string | null; prayer_group_id: string
  groups: { name: string; name_ml: string | null } | null; memberCount: number
}
interface Group { id: string; name: string; name_ml: string | null }
interface UnlinkedProfile { id: string; full_name: string; full_name_ml: string | null; phone: string; house_name: string | null }

const inp = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400'

export default function RegistrySearch({
  households, prayerGroups, unlinkedProfiles,
}: { households: Household[]; prayerGroups: Group[]; unlinkedProfiles: UnlinkedProfile[] }) {
  const router = useRouter()
  const [query, setQuery]               = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [linkingId, setLinkingId]       = useState<string | null>(null)
  const [showUnlinked, setShowUnlinked] = useState(unlinkedProfiles.length > 0)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const filtered = query.trim().length < 1
    ? households
    : households.filter(h =>
        h.house_name.toLowerCase().includes(query.toLowerCase()) ||
        (h.house_name_ml ?? '').includes(query) ||
        (h.address ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (h.groups?.name ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (h.groups?.name_ml ?? '').includes(query)
      )

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createHousehold(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    router.push(`/admin/registry/${result.id}`)
  }

  async function handleCreateWithProfile(e: React.FormEvent<HTMLFormElement>, profileId: string) {
    e.preventDefault(); setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('profile_id', profileId)
    const result = await createHouseholdWithProfile(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    router.push(`/admin/registry/${result.id}`)
  }

  const BhamSelector = () => (
    <select name="prayer_group_id" required className={inp}>
      <option value="">Select Bhagam…</option>
      {prayerGroups.map(g => (
        <option key={g.id} value={g.id}>{g.name_ml ? `${g.name_ml} — ` : ''}{g.name}</option>
      ))}
    </select>
  )

  return (
    <div className="space-y-6">
      {/* ── Unlinked Profiles Panel ── */}
      {unlinkedProfiles.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden">
          <button
            onClick={() => setShowUnlinked(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-amber-100 transition-colors"
          >
            <div>
              <p className="font-bold text-amber-900 text-sm">
                {unlinkedProfiles.length} registered member{unlinkedProfiles.length > 1 ? 's' : ''} not yet in the Registry
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These people have logged in but have no household record. Click one to create their registry entry.
              </p>
            </div>
            {showUnlinked ? <ChevronUp size={18} className="text-amber-700 shrink-0" /> : <ChevronDown size={18} className="text-amber-700 shrink-0" />}
          </button>

          {showUnlinked && (
            <div className="border-t border-amber-200 divide-y divide-amber-100">
              {unlinkedProfiles.map(p => (
                <div key={p.id} className="px-5 py-3 bg-white">
                  {linkingId !== p.id ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-brand-900 font-bold text-sm">{p.full_name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{p.full_name}</p>
                        {p.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{p.full_name_ml}</p>}
                        <p className="text-xs text-muted-foreground">{p.phone}{p.house_name ? ` · ${p.house_name}` : ''}</p>
                      </div>
                      <button
                        onClick={() => setLinkingId(p.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 hover:bg-brand-100 transition-colors whitespace-nowrap"
                      >
                        <UserPlus size={14} /> Add to Registry
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-brand-900">Create household for {p.full_name}</p>
                        <button onClick={() => setLinkingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                      <form onSubmit={e => handleCreateWithProfile(e, p.id)} className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-0.5">House / Family Name *</label>
                            <input name="house_name" required defaultValue={p.house_name ?? ''} className={inp} placeholder="e.g. Pandampurath" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Address</label>
                            <input name="address" className={inp} placeholder="Street, Ward, Alappuzha" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-0.5">Bhagam / Prayer Group *</label>
                            <BhamSelector />
                          </div>
                        </div>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                        <button type="submit" disabled={saving}
                          className="w-full rounded-xl bg-brand-900 text-white text-xs font-semibold py-2.5 hover:bg-brand-800 disabled:opacity-50 transition-colors">
                          {saving ? 'Creating…' : 'Create Household & Link Account'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Search bar ── */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => { setQuery(e.target.value); setShowCreate(false) }}
          placeholder="Search by house name, Bhagam, or address…"
          className="w-full rounded-xl border border-amber-100 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
      </div>

      {/* ── Results ── */}
      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(h => (
            <Link key={h.id} href={`/admin/registry/${h.id}`}
              className="bg-white rounded-xl border border-amber-50 px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <p className="font-semibold text-sm">{h.house_name}</p>
              {h.house_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{h.house_name_ml}</p>}
              {h.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{h.address}</p>}
              <div className="flex items-center gap-2 mt-2">
                {h.groups && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{h.groups.name_ml ?? h.groups.name}</span>}
                <span className="text-[10px] text-muted-foreground">{h.memberCount} member{h.memberCount !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── No match → offer create ── */}
      {query.trim().length > 0 && filtered.length === 0 && !showCreate && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground">No household found matching <strong>&ldquo;{query}&rdquo;</strong></p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-800 transition-colors">
            <Plus size={16} /> Create &ldquo;{query}&rdquo; as new household
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {query.trim().length === 0 && households.length === 0 && unlinkedProfiles.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">No households in the registry yet.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-800 transition-colors">
            <Plus size={16} /> Add First Household
          </button>
        </div>
      )}

      {/* ── Inline blank create form ── */}
      {showCreate && (
        <div className="rounded-2xl border-2 border-brand-900 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-brand-900">Create New Household</p>
            <button onClick={() => setShowCreate(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-1">House / Family Name *</label>
                <input name="house_name" required defaultValue={query} className={inp} placeholder="e.g. Pandampurath" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-1">Name in Malayalam</label>
                <input name="house_name_ml" className={`${inp} font-malayalam`} lang="ml" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Address</label>
                <textarea name="address" rows={2} className={`${inp} resize-none`} placeholder="House No., Street, Ward, Alappuzha" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-1">Bhagam / Prayer Group *</label>
                <BhamSelector />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving}
              className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Household'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
