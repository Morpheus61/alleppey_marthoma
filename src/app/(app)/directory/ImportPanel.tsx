'use client'

import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { importDirectory } from './actions'

export default function ImportPanel() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const fd = new FormData(e.currentTarget)
    const result = await importDirectory(fd)
    if ('error' in result) {
      setStatus('error')
      setMessage(result.error ?? 'Import failed')
    } else {
      setStatus('success')
      setMessage(`${result.imported} member records imported successfully.`)
      formRef.current?.reset()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-brand-900" />
        <h2 className="text-base font-bold text-brand-900">Import Parish Directory</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload an <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file.<br />
        Required columns: <code className="bg-gray-100 px-1 rounded">Name</code>&nbsp;
        <code className="bg-gray-100 px-1 rounded">Phone</code>&nbsp;
        <code className="bg-gray-100 px-1 rounded">House Name</code> (optional: Malayalam Name)
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-200 rounded-xl p-6 cursor-pointer hover:bg-amber-50/50 transition-colors">
          <UploadCloud size={28} className="text-amber-400" />
          <span className="text-sm font-medium text-muted-foreground">Click to choose file</span>
          <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="hidden" />
        </label>

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
          disabled={status === 'loading'}
          className="w-full bg-brand-900 text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Importing…' : 'Import Members'}
        </button>
      </form>
    </div>
  )
}
