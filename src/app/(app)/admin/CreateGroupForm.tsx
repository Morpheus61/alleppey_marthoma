'use client'
import { useState, useRef } from 'react'
import { createGroup } from './actions'

const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900'
const btn = 'rounded-lg px-4 py-2 text-sm font-semibold transition-colors'

async function transliterate(text: string): Promise<string> {
  if (!text.trim()) return ''
  const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`)
  const json = await res.json()
  return json.result ?? ''
}

export default function CreateGroupForm() {
  const nameEnRef = useRef<HTMLInputElement>(null)
  const [nameMl, setNameMl] = useState('')
  const [mlLoading, setMlLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTransliterate() {
    const text = nameEnRef.current?.value ?? ''
    if (!text) return
    setMlLoading(true)
    const result = await transliterate(text)
    if (result) setNameMl(result)
    setMlLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('name_ml', nameMl)
    try {
      await createGroup(fd)
      setNameMl('')
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-4 space-y-3 mb-4">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Create New Group</p>
      <div className="grid grid-cols-2 gap-3">
        <input ref={nameEnRef} name="name" required placeholder="Group name (English)"
          className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
        <div className="col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Name in Malayalam</span>
            <button type="button" onClick={handleTransliterate} disabled={mlLoading}
              className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-50">
              {mlLoading ? 'Transliterating…' : 'Type → മലയാളം'}
            </button>
          </div>
          <input name="name_ml" value={nameMl} onChange={e => setNameMl(e.target.value)}
            placeholder="പേര് (Malayalam)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-malayalam focus:outline-none focus:ring-2 focus:ring-brand-900" />
        </div>
        <textarea name="description" rows={2} placeholder="Description (optional)"
          className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 resize-none" />
        <select name="group_type"
          className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
          <option value="functional">Functional (choir, committee…)</option>
          <option value="prayer">Prayer Group</option>
          <option value="youth">Youth</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving}
        className={`w-full ${btn} bg-brand-900 text-white hover:bg-brand-800 disabled:opacity-50`}>
        {saving ? 'Creating…' : '+ Create Group'}
      </button>
    </form>
  )
}
