'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { searchMembers } from '@/lib/certificates/queries'
import type { MemberRecord } from '@/lib/certificates/types'

interface Props {
  onSelect: (member: MemberRecord) => void
  selected: MemberRecord | null
  onClear: () => void
}

export default function MemberSearch({ onSelect, selected, onClear }: Props) {
  const [query, setQuery] = useState(selected?.full_name ?? '')
  const [results, setResults] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const handleInput = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        setResults(await searchMembers(q))
      } catch { /* noop */ } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const handleSelect = (m: MemberRecord) => {
    setQuery(m.full_name)
    setResults([])
    onSelect(m)
  }

  if (selected) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-brand-900 text-sm">{selected.full_name}</p>
          {selected.full_name_ml && (
            <p className="text-xs font-malayalam text-muted-foreground" lang="ml">
              {selected.full_name_ml}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {[selected.house_name, selected.ward, selected.phone].filter(Boolean).join(' · ')}
          </p>
          {selected.family_register_no && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              Family Reg: {selected.family_register_no}
            </p>
          )}
        </div>
        <button
          onClick={() => { onClear(); setQuery('') }}
          className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-gray-200 rounded-lg px-2 py-1"
        >
          <X size={12} /> Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Type member name…"
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
          autoComplete="off"
        />
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground mt-1.5 px-1">Searching…</p>
      )}

      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-amber-100 shadow-lg divide-y divide-gray-50 max-h-60 overflow-y-auto">
          {results.map(m => (
            <li
              key={m.id}
              onClick={() => handleSelect(m)}
              className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer"
            >
              <p className="font-semibold text-sm text-brand-900">{m.full_name}</p>
              {m.full_name_ml && (
                <p className="text-xs font-malayalam text-muted-foreground" lang="ml">
                  {m.full_name_ml}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {[m.house_name, m.ward || 'No ward', m.phone].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.length > 1 && results.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1.5 px-1">
          No active members found for &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  )
}
