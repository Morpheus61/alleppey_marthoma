'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus } from 'lucide-react'
import { createHousehold } from './actions'
import { useRouter } from 'next/navigation'

interface Household {
  id: string
  house_name: string
  house_name_ml: string | null
  address: string | null
  prayer_group_id: string
  groups: { name: string; name_ml: string | null } | null
  memberCount: number
}

interface Group {
  id: string
  name: string
  name_ml: string | null
}

const inp = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400'

export default function RegistrySearch({
  households,
  prayerGroups,
}: {
  households: Household[]
  prayerGroups: Group[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createHousehold(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    router.push(`/admin/registry/${result.id}`)
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowCreate(false) }}
          placeholder="Search by house name, Bhagam, or address…"
          className="w-full rounded-xl border border-amber-100 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
          autoFocus
        />
      </div>

      {/* Results */}
      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(h => (
            <Link key={h.id} href={`/admin/registry/${h.id}`}
              className="bg-white rounded-xl border border-amber-50 px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <p className="font-semibold text-sm">{h.house_name}</p>
              {h.house_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{h.house_name_ml}</p>}
              {h.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{h.address}</p>}
              <div className="flex items-center gap-2 mt-2">
                {h.groups && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    {h.groups.name_ml ?? h.groups.name}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{h.memberCount} member{h.memberCount !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No results — offer to create */}
      {query.trim().length > 0 && filtered.length === 0 && !showCreate && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground">
            No household found matching <strong>&ldquo;{query}&rdquo;</strong>
          </p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-800 transition-colors">
            <Plus size={16} /> Create &ldquo;{query}&rdquo; as new household
          </button>
        </div>
      )}

      {/* Empty state (no search yet) */}
      {query.trim().length === 0 && households.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">No households in the registry yet.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-800 transition-colors">
            <Plus size={16} /> Add First Household
          </button>
        </div>
      )}

      {/* Inline create form */}
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
                <input name="house_name_ml" className={`${inp} font-malayalam`} lang="ml" placeholder="പൻഡാംബ്യൂറത്ത്" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Address</label>
                <textarea name="address" rows={2} className={`${inp} resize-none`} placeholder="House No., Street, Ward, Alappuzha" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-amber-700 uppercase mb-1">Bhagam / Prayer Group *</label>
                <select name="prayer_group_id" required className={inp}>
                  <option value="">Select Bhagam…</option>
                  {prayerGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name_ml ? `${g.name_ml} — ` : ''}{g.name}
                    </option>
                  ))}
                </select>
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
