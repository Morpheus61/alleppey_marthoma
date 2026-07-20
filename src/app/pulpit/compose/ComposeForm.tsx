'use client'
import { useRef, useState } from 'react'
import { createMessage } from '../actions'

export default function ComposeForm() {
  const formRef   = useRef<HTMLFormElement>(null)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit(isDraft: boolean) {
    if (!formRef.current) return
    const body = (formRef.current.querySelector('[name="body"]') as HTMLTextAreaElement)?.value?.trim()
    if (!body) { setError('Message body is required.'); return }
    setBusy(true)
    setError(null)
    const fd = new FormData(formRef.current)
    fd.set('action', isDraft ? 'draft' : 'publish')
    const result = await createMessage(fd)
    if (result && 'error' in result) {
      setError(result.error)
      setBusy(false)
    }
    // On success the server action redirects — no further client action needed
  }

  const field = 'w-full rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 focus:bg-white transition-colors'

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">New Message</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The Pulpit ·{' '}
          <span className="font-malayalam" lang="ml">ഇടയ സന്ദേശം</span>
        </p>
      </div>

      <form ref={formRef} className="space-y-5" onSubmit={e => e.preventDefault()}>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Title <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </label>
          <input name="title" type="text"
            placeholder="e.g. The Peace That Passes Understanding"
            className={field}
          />
        </div>

        {/* Scripture ref */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Scripture Reference <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </label>
          <input name="scripture_ref" type="text"
            placeholder="e.g. Philippians 4:7"
            className={field}
          />
        </div>

        {/* Scripture English */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Scripture Verse (English) <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </label>
          <textarea name="scripture_text" rows={3}
            placeholder="And the peace of God, which transcends all understanding…"
            className={`${field} resize-none`}
          />
        </div>

        {/* Scripture Malayalam */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Scripture Verse (Malayalam) <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </label>
          <textarea name="scripture_text_ml" rows={3} dir="auto" lang="ml"
            placeholder="ദൈവത്തിന്റെ സമാധാനം…"
            className={`${field} resize-none font-malayalam`}
          />
        </div>

        {/* Body Malayalam */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Message (Malayalam) <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </label>
          <textarea name="body_ml" rows={10} dir="auto" lang="ml"
            placeholder="സന്ദേശം മലയാളത്തിൽ…"
            className={`${field} resize-none font-malayalam leading-relaxed`}
          />
        </div>

        {/* Body English — required */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
            Message (English) <span className="text-red-400">*</span>
          </label>
          <textarea name="body" rows={10} required
            placeholder="Write your message here…"
            className={`${field} resize-none leading-relaxed`}
          />
        </div>

        {/* Pin */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="is_pinned" value="true"
            className="w-4 h-4 rounded border-amber-300 text-brand-900 accent-brand-900"
          />
          <span className="text-sm text-gray-600">
            Pin this message (stays at top of The Pulpit)
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(false)}
            className="w-full bg-brand-900 text-white font-semibold py-4 rounded-xl text-[15px] hover:bg-brand-800 disabled:opacity-50 transition-colors min-h-[56px]"
          >
            {busy ? 'Publishing…' : '🕊️ Publish to The Pulpit'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(true)}
            className="w-full bg-white border border-amber-200 text-gray-600 font-medium py-3.5 rounded-xl text-sm hover:bg-amber-50 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            {busy ? 'Saving…' : 'Save as Draft'}
          </button>
        </div>

      </form>
    </div>
  )
}
