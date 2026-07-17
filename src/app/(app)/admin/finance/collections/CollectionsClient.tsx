'use client'
import { useState, useRef } from 'react'
import { createCollection, updateCollection, toggleCollection } from '../actions'

interface Fund   { id: string; name: string; name_ml: string | null }
interface ColType {
  id: string; name: string; name_ml: string | null; kind: string
  amount_mode: string; amount: number | null
  period_start: string | null; period_end: string | null; is_active: boolean
  funds: Fund | null
}

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white'

const KIND_LABELS: Record<string,string> = {
  subscription: 'Subscription (monthly)',
  service_offertory: 'Service Offertory',
  appeal: 'Appeal / One-time',
}

async function transliterate(text: string): Promise<string> {
  if (!text.trim()) return ''
  const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`)
  const json = await res.json()
  return json.result ?? ''
}

// ── Single collection row with inline edit ──────────────────────────────────
function CollectionRow({ col, onToggle }: { col: ColType; onToggle: (id: string, active: boolean) => void }) {
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const nameEnRef = useRef<HTMLInputElement>(null)
  const [nameMl, setNameMl]     = useState(col.name_ml ?? '')
  const [mlLoading, setMlLoading] = useState(false)

  async function handleTransliterate() {
    const text = nameEnRef.current?.value ?? ''
    if (!text) return
    setMlLoading(true)
    const result = await transliterate(text)
    if (result) setNameMl(result)
    setMlLoading(false)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('name_ml', nameMl)
    const result = await updateCollection(col.id, fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-xl border ${col.is_active ? 'border-amber-100' : 'border-gray-100 opacity-60'} px-4 py-3 shadow-sm`}>
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {col.name_ml && <p className="font-semibold text-sm font-malayalam" lang="ml">{col.name_ml}</p>}
            <p className="font-semibold text-sm">{col.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {KIND_LABELS[col.kind] ?? col.kind}
              {col.amount ? ` · ₹${col.amount} ${col.amount_mode}` : ` · ${col.amount_mode}`}
              {col.period_end ? ` · closes ${new Date(col.period_end).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEditing(true)}
              className="text-[11px] text-brand-700 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50">
              Edit
            </button>
            <button onClick={() => onToggle(col.id, !col.is_active)}
              className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border ${
                col.is_active
                  ? 'text-red-600 border-red-200 hover:bg-red-50'
                  : 'text-green-600 border-green-200 hover:bg-green-50'
              }`}>
              {col.is_active ? 'Archive' : 'Restore'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Name (English) *</label>
              <input ref={nameEnRef} name="name" required defaultValue={col.name} className={inp} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-semibold text-amber-600 uppercase">Malayalam</label>
                <button type="button" onClick={handleTransliterate} disabled={mlLoading}
                  className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-50">
                  {mlLoading ? '…' : 'Type → മലയാളം'}
                </button>
              </div>
              <input value={nameMl} onChange={e => setNameMl(e.target.value)} placeholder="മലയാളം" className={`${inp} font-malayalam`} lang="ml" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Amount Mode</label>
              <select name="amount_mode" defaultValue={col.amount_mode} className={inp}>
                <option value="fixed">Fixed</option>
                <option value="suggested">Suggested</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Amount (₹)</label>
              <input name="amount" type="number" min="0" step="0.01" defaultValue={col.amount ?? ''} placeholder="leave blank if open" className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Window Opens</label>
              <input name="period_start" type="date" defaultValue={col.period_start ?? ''} className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Window Closes</label>
              <input name="period_end" type="date" defaultValue={col.period_end ?? ''} className={inp} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-brand-900 text-white text-xs font-semibold py-2.5 hover:bg-brand-800 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Create new collection form ───────────────────────────────────────────────
function CreateForm({ funds }: { funds: Fund[] }) {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const nameEnRef = useRef<HTMLInputElement>(null)
  const [nameMl, setNameMl]   = useState('')
  const [mlLoading, setMlLoading] = useState(false)
  const [amountMode, setAmountMode] = useState('fixed')

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
    const result = await createCollection(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    setOpen(false); setNameMl('')
    e.currentTarget.reset()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full rounded-xl border-2 border-dashed border-amber-200 text-amber-700 text-sm font-semibold py-3 hover:bg-amber-50 transition-colors">
      + Add New Collection
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-brand-200 p-4 space-y-3">
      <p className="text-xs font-bold text-brand-900 uppercase tracking-wide">New Collection Type</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Name (English) *</label>
          <input ref={nameEnRef} name="name" required placeholder="e.g. Christmas Offering" className={inp} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] font-semibold text-amber-600 uppercase">Malayalam</label>
            <button type="button" onClick={handleTransliterate} disabled={mlLoading}
              className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-50">
              {mlLoading ? '…' : 'Type → മലയാളം'}
            </button>
          </div>
          <input value={nameMl} onChange={e => setNameMl(e.target.value)} placeholder="മലയാളം" className={`${inp} font-malayalam`} lang="ml" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Fund *</label>
          <select name="fund_id" required className={inp}>
            <option value="">Select fund…</option>
            {funds.map(f => <option key={f.id} value={f.id}>{f.name_ml ?? f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Type</label>
          <select name="kind" className={inp}>
            <option value="appeal">Appeal / One-time</option>
            <option value="subscription">Subscription (monthly)</option>
            <option value="service_offertory">Service Offertory</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Amount Mode</label>
          <select name="amount_mode" value={amountMode} onChange={e => setAmountMode(e.target.value)} className={inp}>
            <option value="open">Open (any amount)</option>
            <option value="fixed">Fixed</option>
            <option value="suggested">Suggested</option>
          </select>
        </div>
        {amountMode !== 'open' && (
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Amount (₹)</label>
            <input name="amount" type="number" min="0" step="0.01" placeholder="0" className={inp} />
          </div>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Window Opens</label>
          <input name="period_start" type="date" className={inp} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Window Closes</label>
          <input name="period_end" type="date" className={inp} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 rounded-xl bg-brand-900 text-white text-xs font-semibold py-2.5 hover:bg-brand-800 disabled:opacity-50">
          {saving ? 'Creating…' : 'Create Collection'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3">Cancel</button>
      </div>
    </form>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function CollectionsClient({ collections, funds }: { collections: ColType[]; funds: Fund[] }) {
  const [items, setItems] = useState(collections)

  async function handleToggle(id: string, active: boolean) {
    await toggleCollection(id, active)
    setItems(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c))
  }

  const active   = items.filter(c => c.is_active)
  const archived = items.filter(c => !c.is_active)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {active.map(c => <CollectionRow key={c.id} col={c} onToggle={handleToggle} />)}
        {active.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No active collections</p>}
      </div>

      <CreateForm funds={funds} />

      {archived.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-600">
            {archived.length} archived collection{archived.length > 1 ? 's' : ''}
          </summary>
          <div className="space-y-2 mt-2">
            {archived.map(c => <CollectionRow key={c.id} col={c} onToggle={handleToggle} />)}
          </div>
        </details>
      )}
    </div>
  )
}
