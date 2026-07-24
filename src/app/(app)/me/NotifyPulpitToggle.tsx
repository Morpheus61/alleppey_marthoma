'use client'

import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

interface Props {
  initialValue: boolean
  action: (value: boolean) => Promise<{ error: string } | { success: true }>
}

export default function NotifyPulpitToggle({ initialValue, action }: Props) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving]   = useState(false)

  async function toggle() {
    const next = !enabled
    setSaving(true)
    const result = await action(next)
    setSaving(false)
    if (!('error' in result)) setEnabled(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={enabled}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-1 disabled:opacity-50',
        enabled ? 'bg-brand-900' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 items-center justify-center',
          enabled ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      >
        {enabled
          ? <Bell size={10} className="text-brand-900" />
          : <BellOff size={10} className="text-gray-400" />}
      </span>
    </button>
  )
}
