'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHousehold } from './actions'

const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400 bg-white'

export default function NewHouseholdForm({ prayerGroups }: { prayerGroups: { id: string; name: string; name_ml: string | null }[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await createHousehold(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    router.push(`/admin/registry/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 space-y-4 max-w-lg">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">House / Family Name *</label>
          <input name="house_name" required placeholder="e.g. Pandampurath" className={inp} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Name in Malayalam</label>
          <input name="house_name_ml" placeholder="പൻഡാമ്പ്യൂറത്ത്" className={`${inp} font-malayalam`} lang="ml" />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Address</label>
          <textarea name="address" rows={2} placeholder="House No., Street, Ward, Alappuzha" className={`${inp} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Bhagam / Prayer Group *</label>
          <select name="prayer_group_id" required className={inp}>
            <option value="">Select Bhagam…</option>
            {prayerGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name_ml ? `${g.name_ml} — ` : ''}{g.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">This links the family to their ward and prayer group automatically.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors">
        {saving ? 'Creating…' : 'Create Household'}
      </button>
    </form>
  )
}
