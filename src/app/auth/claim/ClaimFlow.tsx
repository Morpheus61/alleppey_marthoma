'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { claimFamilyMember } from './actions'
import { useRouter } from 'next/navigation'
import { Search, Home, Users, CheckCircle } from 'lucide-react'

interface Household { id: string; house_name: string; house_name_ml: string | null; bhagam_name: string; bhagam_name_ml: string | null }
interface Member { id: string; full_name: string; full_name_ml: string | null; relation_to_head: string | null }

const inp = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400'

export default function ClaimFlow() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [households, setHouseholds] = useState<Household[]>([])
  const [selected, setSelected] = useState<Household | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(term: string) {
    setQuery(term)
    if (term.trim().length < 2) { setHouseholds([]); return }
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('search_households', { search_term: term.trim() })
    setHouseholds((data as Household[]) ?? [])
    setSearching(false)
  }

  async function handleSelectHousehold(h: Household) {
    setSelected(h)
    setMembers([])
    setError(null)
    const supabase = createClient()
    const { data } = await supabase.rpc('household_claimable_members', { p_family_id: h.id })
    setMembers((data as Member[]) ?? [])
  }

  async function handleClaim(memberId: string) {
    setClaiming(true); setError(null)
    const result = await claimFamilyMember(memberId)
    setClaiming(false)
    if ('error' in result) { setError(result.error); return }
    if (result.autoApproved) {
      router.push('/')
    } else {
      router.push('/auth/pending')
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Search */}
      {!selected && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Search for your household by house name or family name.
            </p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="House name, e.g. Pandampurath…"
                className={`${inp} pl-9`}
                autoFocus
              />
            </div>
          </div>

          {searching && <p className="text-sm text-muted-foreground">Searching…</p>}

          {households.length > 0 && (
            <div className="space-y-2">
              {households.map(h => (
                <button key={h.id} onClick={() => handleSelectHousehold(h)}
                  className="w-full text-left rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
                  <p className="font-semibold text-sm">{h.house_name}</p>
                  {h.house_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{h.house_name_ml}</p>}
                  <p className="text-xs text-amber-700 mt-0.5">{h.bhagam_name_ml ?? h.bhagam_name}</p>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && households.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No households found. Contact the church office if your family is not listed.
            </p>
          )}
        </div>
      )}

      {/* Step 2: Pick family member */}
      {selected && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <Home size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">{selected.house_name}</p>
              {selected.house_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{selected.house_name_ml}</p>}
              <p className="text-xs text-amber-700">{selected.bhagam_name_ml ?? selected.bhagam_name}</p>
            </div>
            <button onClick={() => { setSelected(null); setMembers([]) }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Change
            </button>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Select yourself from the list:
            </p>

            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                All members of this household are already registered, or the household has no members yet. Contact the church office.
              </p>
            )}

            <div className="space-y-2">
              {members.map(m => (
                <button key={m.id} onClick={() => handleClaim(m.id)}
                  disabled={claiming}
                  className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-brand-900 hover:shadow-md disabled:opacity-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-brand-900 font-bold text-sm">{m.full_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.full_name}</p>
                      {m.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{m.full_name_ml}</p>}
                      {m.relation_to_head && <p className="text-xs text-muted-foreground capitalize">{m.relation_to_head}</p>}
                    </div>
                    {claiming && <CheckCircle size={16} className="ml-auto text-brand-900 animate-pulse" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
