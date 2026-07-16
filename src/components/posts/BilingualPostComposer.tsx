'use client'

/**
 * BilingualPostComposer
 *
 * Dual-language post form (English + Malayalam).
 * At least ONE language is required (Malayalam-only posts are fully valid).
 *
 * PRECISION WORKFLOW
 * ──────────────────
 * 1. Write content in English and/or Malayalam.
 * 2. Optionally use "Draft →" for a phonetic transliteration starting point.
 * 3. Rewrite ML draft in proper Malayalam, tick the review box.
 * 4. Click "Preview & Post" — see the exact feed card that members will see.
 * 5. Click "Send →" to confirm. Machine output can never be posted without review.
 */

import { useState, useRef } from 'react'
import { Languages, AlertTriangle, CheckCircle, Send, Pencil } from 'lucide-react'
import { format } from 'date-fns'

export interface GroupOption {
  id: string
  name: string
}

interface Props {
  action: (formData: FormData) => Promise<void>
  groupName?: string
  showGroupSelector?: boolean
  groupOptions?: GroupOption[]
  showPinOption?: boolean
  submitLabel?: string
}

const inp =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400'

async function transliterateWord(word: string): Promise<string> {
  try {
    const res = await fetch(`/api/transliterate?text=${encodeURIComponent(word)}`)
    const json = (await res.json()) as { result?: string }
    return json.result || word
  } catch {
    return word
  }
}

async function transliterateBlock(text: string): Promise<string> {
  if (!text.trim()) return ''
  const lines = text.split('\n')
  const convertedLines = await Promise.all(
    lines.map(async (line) => {
      if (!line.trim()) return ''
      const words = line.trim().split(/\s+/)
      const converted = await Promise.all(words.map(transliterateWord))
      return converted.join(' ')
    }),
  )
  return convertedLines.join('\n')
}

export default function BilingualPostComposer({
  action,
  groupName,
  showGroupSelector = false,
  groupOptions = [],
  showPinOption = false,
  submitLabel = 'Post',
}: Props) {
  const [bodyEn, setBodyEn]   = useState('')
  const [titleMl, setTitleMl] = useState('')
  const [bodyMl, setBodyMl]   = useState('')
  const [converting, setConverting] = useState<'title' | 'body' | null>(null)
  const [reviewed, setReviewed]     = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)   // preview-before-post gate
  const [validationErr, setValidationErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const titleEnRef   = useRef<HTMLInputElement>(null)
  const visibilityRef = useRef<HTMLSelectElement>(null)
  const formRef      = useRef<HTMLFormElement>(null)

  const hasMl      = titleMl.trim().length > 0 || bodyMl.trim().length > 0
  const hasContent = bodyEn.trim().length > 0 || bodyMl.trim().length > 0

  async function draftTitleMl() {
    const text = titleEnRef.current?.value ?? ''
    if (!text.trim()) return
    setConverting('title')
    const result = await transliterateBlock(text)
    setTitleMl(result)
    setReviewed(false)
    setConverting(null)
  }

  async function draftBodyMl() {
    const text = bodyEn
    if (!text.trim()) return
    setConverting('body')
    const result = await transliterateBlock(text)
    setBodyMl(result)
    setReviewed(false)
    setConverting(null)
  }

  /** Step 1: validate → show preview confirm panel */
  function handlePreview() {
    setValidationErr(null)
    if (!hasContent) {
      setValidationErr('Write at least one language before posting.')
      return
    }
    if (hasMl && !reviewed) {
      setValidationErr('Tick the Malayalam review box before previewing.')
      return
    }
    setConfirmStep(true)
  }

  /** Step 2: actually submit */
  async function handleConfirm() {
    if (!formRef.current) return
    setSaving(true)
    const fd = new FormData(formRef.current)
    fd.set('body',     bodyEn.trim() || bodyMl.trim())   // fall back to ML if EN empty
    fd.set('title_ml', titleMl.trim())
    fd.set('body_ml',  bodyMl.trim())
    await action(fd)
    setBodyEn('')
    setTitleMl('')
    setBodyMl('')
    setReviewed(false)
    setConfirmStep(false)
    setSaving(false)
    setSaved(true)
    formRef.current?.reset()
    setTimeout(() => setSaved(false), 3000)
  }

  const btnBase = 'flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 transition-colors disabled:opacity-50'
  const draftBtn = `${btnBase} text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100`

  // ── Preview / confirm panel ────────────────────────────────────────────────
  if (confirmStep) {
    const titleEn = titleEnRef.current?.value ?? ''
    return (
      <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 space-y-4">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          Preview — how members will see this post
        </p>

        {/* Feed card mock */}
        <article className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-1.5">
          {(titleMl || titleEn) && (
            <div className="space-y-0.5">
              {titleMl && <p className="font-semibold font-malayalam" lang="ml">{titleMl}</p>}
              {titleEn && <p className={`font-semibold ${titleMl ? 'text-sm text-muted-foreground' : ''}`}>{titleEn}</p>}
            </div>
          )}
          {bodyMl && <p className="text-sm font-malayalam whitespace-pre-wrap" lang="ml">{bodyMl}</p>}
          {bodyEn && <p className={`text-sm whitespace-pre-wrap ${bodyMl ? 'text-muted-foreground' : ''}`}>{bodyEn}</p>}
          <p className="text-xs text-muted-foreground pt-1">{format(new Date(), 'd MMM yyyy')}</p>
        </article>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmStep(false)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} /> Edit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-900 text-white py-3 text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 transition-colors"
          >
            {saving
              ? 'Sending…'
              : <><Send size={15} /> {submitLabel}</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Composer form ──────────────────────────────────────────────────────────
  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 space-y-4"
    >
      {/* Precision notice */}
      <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong>"Draft →"</strong> is phonetic conversion only — not translation.
          At least <strong>one language</strong> (English or Malayalam) is required.
          Malayalam-only posts are fully valid.
        </span>
      </div>

      {/* Title row */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Title (English) — optional
          </label>
          <input ref={titleEnRef} name="title" placeholder="e.g. Sunday Service Notice" className={inp} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              തലക്കെട്ട് (Malayalam)
            </label>
            <button type="button" onClick={draftTitleMl} disabled={converting === 'title'} className={draftBtn}>
              <Languages size={12} />
              {converting === 'title' ? 'Converting…' : 'Draft →'}
            </button>
          </div>
          <input
            value={titleMl}
            onChange={(e) => { setTitleMl(e.target.value); setReviewed(false) }}
            placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക"
            className={`${inp} font-malayalam`}
            lang="ml"
          />
        </div>
      </div>

      {/* Body row */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Message (English)
          </label>
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            rows={6}
            placeholder={groupName ? `Write a message for ${groupName}…` : 'Write your message to the parish…'}
            className={`${inp} resize-none`}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              സന്ദേശം (Malayalam)
            </label>
            <button type="button" onClick={draftBodyMl} disabled={converting === 'body'} className={draftBtn}>
              <Languages size={12} />
              {converting === 'body' ? 'Converting…' : 'Draft →'}
            </button>
          </div>
          <textarea
            value={bodyMl}
            onChange={(e) => { setBodyMl(e.target.value); setReviewed(false) }}
            rows={6}
            placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക"
            className={`${inp} resize-none font-malayalam`}
            lang="ml"
          />
          {bodyMl && !reviewed && (
            <p className="text-[11px] text-amber-700 mt-1">⬆ Rewrite in proper Malayalam, then tick the review box.</p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-3">
        {showGroupSelector && (
          <select name="group_id" className={`flex-1 min-w-[180px] ${inp}`}>
            <option value="">📣 All Members (Parish-wide)</option>
            {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select ref={visibilityRef} name="visibility" className={`${inp} w-auto`}>
          <option value="members">Members only</option>
          <option value="public">Public</option>
        </select>
        {showPinOption && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" name="is_pinned" className="rounded accent-brand-900" />
            📌 Pin this post
          </label>
        )}
      </div>

      {/* ML review checkbox */}
      {hasMl && (
        <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-0.5 accent-brand-900"
          />
          <span className="text-sm font-semibold text-amber-900">
            I have read the Malayalam text above and it is correct.
          </span>
        </label>
      )}

      {/* Validation error */}
      {validationErr && (
        <p className="text-sm text-red-600 font-medium">{validationErr}</p>
      )}

      {/* Preview & Post button */}
      <button
        type="button"
        onClick={handlePreview}
        disabled={saving || saved}
        className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {saved
          ? <><CheckCircle size={16} /> Posted!</>
          : 'Preview & Post →'
        }
      </button>
    </form>
  )
}


export interface GroupOption {
  id: string
  name: string
}

interface Props {
  action: (formData: FormData) => Promise<void>
  groupName?: string
  showGroupSelector?: boolean
  groupOptions?: GroupOption[]
  showPinOption?: boolean
  submitLabel?: string
}

const inp =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 placeholder:text-gray-400'

/** Transliterate a single word via the proxy API */
async function transliterateWord(word: string): Promise<string> {
  try {
    const res = await fetch(`/api/transliterate?text=${encodeURIComponent(word)}`)
    const json = (await res.json()) as { result?: string }
    return json.result || word
  } catch {
    return word
  }
}

/**
 * Transliterate every word in a block of text (word-by-word, parallel).
 * Preserves line breaks. Returns phonetic Malayalam script.
 * NOTE: This is phonetic transliteration, NOT semantic translation.
 */
async function transliterateBlock(text: string): Promise<string> {
  if (!text.trim()) return ''
  const lines = text.split('\n')
  const convertedLines = await Promise.all(
    lines.map(async (line) => {
      if (!line.trim()) return ''
      const words = line.trim().split(/\s+/)
      const converted = await Promise.all(words.map(transliterateWord))
      return converted.join(' ')
    }),
  )
  return convertedLines.join('\n')
}

export default function BilingualPostComposer({
  action,
  groupName,
  showGroupSelector = false,
  groupOptions = [],
  showPinOption = false,
  submitLabel = 'Post',
}: Props) {
  const [titleMl, setTitleMl] = useState('')
  const [bodyMl, setBodyMl] = useState('')
  const [converting, setConverting] = useState<'title' | 'body' | null>(null)
  const [preview, setPreview] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const titleEnRef = useRef<HTMLInputElement>(null)
  const bodyEnRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const hasMl = titleMl.trim().length > 0 || bodyMl.trim().length > 0

  async function draftTitleMl() {
    const text = titleEnRef.current?.value ?? ''
    if (!text.trim()) return
    setConverting('title')
    const result = await transliterateBlock(text)
    setTitleMl(result)
    setReviewed(false)
    setConverting(null)
  }

  async function draftBodyMl() {
    const text = bodyEnRef.current?.value ?? ''
    if (!text.trim()) return
    setConverting('body')
    const result = await transliterateBlock(text)
    setBodyMl(result)
    setReviewed(false)
    setConverting(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    // Inject controlled Malayalam values
    fd.set('title_ml', titleMl.trim())
    fd.set('body_ml', bodyMl.trim())
    await action(fd)
    // Reset
    setTitleMl('')
    setBodyMl('')
    setPreview(false)
    setReviewed(false)
    setSaving(false)
    setSaved(true)
    formRef.current?.reset()
    setTimeout(() => setSaved(false), 3000)
  }

  const btnBase =
    'flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 transition-colors disabled:opacity-50'
  const draftBtn = `${btnBase} text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100`

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 space-y-4"
    >
      {/* ── Precision notice ── */}
      <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong>"Draft →"</strong> does <em>phonetic script conversion only</em> — not translation.
          It converts English letters to Malayalam script (e.g. &ldquo;Marthoma&rdquo; →{' '}
          <span className="font-malayalam" lang="ml">മർത്തോമ്മ</span>).
          Always <strong>rewrite the draft</strong> in proper Malayalam and tick the review box before posting.
        </span>
      </div>

      {/* ── Title row ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* English title */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Title (English) — optional
          </label>
          <input
            ref={titleEnRef}
            name="title"
            placeholder="e.g. Sunday Service Notice"
            className={inp}
          />
        </div>

        {/* Malayalam title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              തലക്കെട്ട് (Malayalam)
            </label>
            <button
              type="button"
              onClick={draftTitleMl}
              disabled={converting === 'title'}
              className={draftBtn}
            >
              <Languages size={12} />
              {converting === 'title' ? 'Converting…' : 'Draft →'}
            </button>
          </div>
          <input
            value={titleMl}
            onChange={(e) => {
              setTitleMl(e.target.value)
              setReviewed(false)
            }}
            placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക"
            className={`${inp} font-malayalam`}
            lang="ml"
          />
        </div>
      </div>

      {/* ── Body row ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* English body */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Message (English)
          </label>
          <textarea
            ref={bodyEnRef}
            name="body"
            required
            rows={6}
            placeholder={
              groupName
                ? `Write a message for ${groupName}…`
                : 'Write your message to the parish…'
            }
            className={`${inp} resize-none`}
          />
        </div>

        {/* Malayalam body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              സന്ദേശം (Malayalam)
            </label>
            <button
              type="button"
              onClick={draftBodyMl}
              disabled={converting === 'body'}
              className={draftBtn}
            >
              <Languages size={12} />
              {converting === 'body' ? 'Converting…' : 'Draft →'}
            </button>
          </div>
          <textarea
            value={bodyMl}
            onChange={(e) => {
              setBodyMl(e.target.value)
              setReviewed(false)
            }}
            rows={6}
            placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക"
            className={`${inp} resize-none font-malayalam`}
            lang="ml"
          />
          {bodyMl && !reviewed && (
            <p className="text-[11px] text-amber-700 mt-1">
              ⬆ Rewrite this in proper Malayalam, then tick the review box below.
            </p>
          )}
        </div>
      </div>

      {/* ── Post options ── */}
      <div className="flex flex-wrap items-center gap-3">
        {showGroupSelector && (
          <select
            name="group_id"
            className={`flex-1 min-w-[180px] ${inp}`}
          >
            <option value="">📣 All Members (Parish-wide)</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <select name="visibility" className={`${inp} w-auto`}>
          <option value="members">Members only</option>
          <option value="public">Public</option>
        </select>
        {showPinOption && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" name="is_pinned" className="rounded accent-brand-900" />
            📌 Pin this post
          </label>
        )}
      </div>

      {/* ── Preview ── */}
      {hasMl && (
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 hover:underline"
        >
          {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          {preview ? 'Hide Preview' : 'Preview Bilingual Post'}
        </button>
      )}

      {preview && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
            Preview — how members will see this
          </p>
          {(titleMl || titleEnRef.current?.value) && (
            <div className="space-y-0.5">
              {titleMl && (
                <p className="font-semibold font-malayalam text-sm" lang="ml">
                  {titleMl}
                </p>
              )}
              {titleEnRef.current?.value && (
                <p className="font-semibold text-sm">{titleEnRef.current.value}</p>
              )}
            </div>
          )}
          {(bodyMl || bodyEnRef.current?.value) && (
            <div className="space-y-1 mt-2">
              {bodyMl && (
                <p className="text-sm font-malayalam whitespace-pre-wrap" lang="ml">
                  {bodyMl}
                </p>
              )}
              {bodyEnRef.current?.value && (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {bodyEnRef.current.value}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Review confirmation (required when ML content present) ── */}
      {hasMl && (
        <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-0.5 accent-brand-900"
          />
          <span className="text-sm font-semibold text-amber-900">
            I have read the Malayalam text above and it is correct.
          </span>
        </label>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={saving || (hasMl && !reviewed)}
        className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving
          ? 'Posting…'
          : saved
            ? '✓ Posted!'
            : hasMl && !reviewed
              ? '⚠ Tick "I reviewed" to enable posting'
              : submitLabel}
      </button>
    </form>
  )
}
