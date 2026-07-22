'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Search, Home } from 'lucide-react'

import { IST_TZ } from '@/lib/dates'

export interface FamilyMemberEntry {
  id: string
  full_name: string
  full_name_ml: string | null
  relation: string | null
  date_of_birth: string | null  // 'YYYY-MM-DD'
  gender: string | null
  phone: string | null
  email: string | null
}

export interface FamilyEntry {
  family_id: string
  house_name: string
  house_name_ml: string | null
  address: string | null
  bhagam_name: string
  bhagam_name_ml: string | null
  members: FamilyMemberEntry[]
  wedding_date: string | null  // 'YYYY-MM-DD'
}

const RELATION_ORDER: Record<string, number> = {
  head: 1, spouse: 2, son: 3, daughter: 4,
  'daughter-in-law': 5,
  father: 6, mother: 7, brother: 8, sister: 9,
  grandchild: 10, other: 11,
}

function fmtDate(s: string | null): string | null {
  if (!s) return null
  return new Date(s + 'T00:00:00+05:30').toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAnniv(s: string | null): string | null {
  if (!s) return null
  const d = new Date(s + 'T00:00:00+05:30')
  const year = d.toLocaleString('en-IN', { timeZone: IST_TZ, year: 'numeric' })
  return d.toLocaleDateString('en-IN', { timeZone: IST_TZ, day: 'numeric', month: 'long' }) + ` (${year})`
}

function waUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const e164 = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`
  return `https://wa.me/${e164}`
}

export default function FamilyDirectory({
  families, isAdmin,
}: {
  families: FamilyEntry[]
  isAdmin: boolean
}) {
  const [query, setQuery]       = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()
  const filtered = q.length < 2
    ? families
    : families.filter(f =>
        f.house_name.toLowerCase().includes(q) ||
        (f.house_name_ml ?? '').includes(query.trim()) ||
        f.bhagam_name.toLowerCase().includes(q) ||
        (f.bhagam_name_ml ?? '').includes(query.trim()) ||
        (f.address ?? '').toLowerCase().includes(q) ||
        f.members.some(m =>
          m.full_name.toLowerCase().includes(q) ||
          (m.full_name_ml ?? '').includes(query.trim())
        )
      )

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by family, member name, or bhagam…"
          className="w-full rounded-xl border border-amber-100 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'family' : 'families'}
        {q.length >= 2 ? ` matching "${query.trim()}"` : ''}
      </p>

      {filtered.map(f => {
        const isOpen = expanded.has(f.family_id)
        const head   = f.members.find(m => m.relation === 'head')
        const spouse = f.members.find(m => m.relation === 'spouse')
        const sorted = [...f.members].sort((a, b) =>
          (RELATION_ORDER[a.relation ?? 'other'] ?? 10) -
          (RELATION_ORDER[b.relation ?? 'other'] ?? 10)
        )

        return (
          <div key={f.family_id}
            className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">

            {/* ── Card header — always visible ── */}
            <button
              onClick={() => toggle(f.family_id)}
              className="w-full text-left px-4 py-3.5 hover:bg-amber-50/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Home size={17} className="text-brand-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold text-brand-900 text-sm">{f.house_name}</span>
                    {f.house_name_ml && (
                      <span className="font-malayalam text-xs text-muted-foreground" lang="ml">
                        {f.house_name_ml}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {f.bhagam_name_ml
                      ? <><span className="font-malayalam" lang="ml">{f.bhagam_name_ml}</span> — {f.bhagam_name}</>
                      : f.bhagam_name}
                  </p>
                  {/* Member names preview when collapsed */}
                  {!isOpen && f.members.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {sorted.map(m => m.full_name).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-muted-foreground mt-2">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>

            {/* ── Expanded details ── */}
            {isOpen && (
              <div className="border-t border-amber-50 divide-y divide-amber-50">

                {/* Address + Anniversary row */}
                {/* TRIAL: address hidden from non-admins (revert: remove isAdmin guard) */}
                {((isAdmin && f.address) || f.wedding_date) && (
                  <div className="px-4 py-3 grid sm:grid-cols-2 gap-3">
                    {isAdmin && f.address && (
                      <div>
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                          Address
                        </p>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                          {f.address}
                        </p>
                      </div>
                    )}
                    {f.wedding_date && (
                      <div>
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                          Wedding Anniversary
                        </p>
                        <p className="text-xs text-gray-700">
                          {fmtAnniv(f.wedding_date)}
                        </p>
                        {head && spouse && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {head.full_name} &amp; {spouse.full_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Members list */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
                    Family Members ({f.members.length})
                  </p>
                  <div className="space-y-2.5">
                    {sorted.map(m => (
                      <div key={m.id} className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-50 border border-amber-100 flex items-center justify-center shrink-0 text-brand-900 font-bold text-xs mt-0.5">
                          {(m.full_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight">{m.full_name}</p>
                          {m.full_name_ml && (
                            <p className="text-xs font-malayalam text-muted-foreground leading-tight" lang="ml">
                              {m.full_name_ml}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            <span className="capitalize font-medium">{m.relation ?? 'Member'}</span>
                            {m.date_of_birth && (
                              <> · <span>b. {fmtDate(m.date_of_birth)}</span></>
                            )}
                            {m.gender && (
                              <> · <span className="capitalize">{m.gender}</span></>
                            )}
                          </p>
                          {/* Phone — show for all if present; email for admin only */}
                          {/* TRIAL: phone hidden from non-admins (revert: remove isAdmin guard) */}
                          {isAdmin && m.phone && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span>📱 {m.phone}</span>
                              <a
                                href={waUrl(m.phone)}
                                onClick={e => e.stopPropagation()}
                                target="_blank" rel="noreferrer"
                                className="text-green-600 hover:underline font-medium"
                              >WhatsApp</a>
                            </p>
                          )}
                          {isAdmin && m.email && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              ✉ {m.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">
          No families found{q.length >= 2 ? ` for "${query.trim()}"` : ''}.
        </p>
      )}
    </div>
  )
}
