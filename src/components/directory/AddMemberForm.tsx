'use client'

import { useRef, useState } from 'react'
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import { addMember } from '@/app/(app)/directory/actions'

const inp =
  'w-full rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400 shadow-sm'

export default function AddMemberForm() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('saving')
    const fd = new FormData(e.currentTarget)
    const result = await addMember(fd)
    if (result && 'error' in result) {
      setStatus('error')
      setMessage(result.error ?? 'Could not add member')
    } else {
      setStatus('success')
      setMessage('Member added successfully.')
      formRef.current?.reset()
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus size={20} className="text-brand-900" />
        <h2 className="text-base font-bold text-brand-900">Add Single Member</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the member&apos;s details manually. They will be auto-activated when they first sign in with this mobile number.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Full Name *
            </label>
            <input
              name="full_name"
              required
              placeholder="e.g. Thomas Varughese"
              className={inp}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Name in Malayalam
            </label>
            <input
              name="full_name_ml"
              placeholder="തോമസ് വർഗ്ഗീസ്"
              className={`${inp} font-malayalam`}
              lang="ml"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Mobile Number *
            </label>
            <input
              name="phone"
              required
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit number"
              pattern="\d{10}"
              title="Enter a 10-digit Indian mobile number"
              className={inp}
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              House / Family Name
            </label>
            <input
              name="house_name"
              placeholder="e.g. Parayil House"
              className={inp}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Status
            </label>
            <select name="status" className={inp}>
              <option value="active">Active — can log in immediately</option>
              <option value="pending">Pending — needs admin approval after first login</option>
            </select>
          </div>
        </div>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">
            <CheckCircle size={16} /> {message}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2 text-sm">
            <AlertCircle size={16} /> {message}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="w-full bg-brand-900 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {status === 'saving' ? 'Adding…' : 'Add Member'}
        </button>
      </form>
    </div>
  )
}
