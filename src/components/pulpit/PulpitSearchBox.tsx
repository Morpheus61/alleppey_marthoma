'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

export default function PulpitSearchBox() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery]       = useState(searchParams.get('q') ?? '')
  const [, startTransition] = useTransition()

  function handleSearch(value: string) {
    setQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim().length >= 2) {
      params.set('q', value.trim())
      params.delete('tab')
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.push(`/pulpit?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search messages…"
        className="w-full rounded-xl border border-amber-100 bg-white pl-9 pr-9 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
      />
      {query && (
        <button
          type="button"
          onClick={() => handleSearch('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
