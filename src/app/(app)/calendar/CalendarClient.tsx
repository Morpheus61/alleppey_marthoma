'use client'
import { useState, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react'
import { createEvent, deleteEvent } from './actions'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface CalEvent {
  id: string
  title: string
  title_ml: string | null
  starts_at: string
  ends_at: string | null
  venue: string | null
  visibility: string
  group_id: string | null
  is_festival: boolean
  created_by: string
  groups: { name: string; name_ml: string | null; group_type: string } | null
}
interface Template {
  id: string
  name: string
  name_ml: string | null
  group_type_hint: string | null
  default_time: string | null
  default_venue: string | null
  default_visibility: string
  default_reminder_minutes: number
  recurrence_suggestion: string | null
  sort_order: number
}
interface PrayerGroup {
  id: string
  name: string
  name_ml: string | null
}
interface FamilyUnit {
  id: string
  house_name: string
  house_name_ml: string | null
  prayer_group_id: string | null
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}
function buildStartsAt(date: string, time: string) {
  // date = 'YYYY-MM-DD', time = 'HH:MM'
  return `${date}T${time}:00+05:30`
}
function buildRRule(recurrence: string, date: string): string | null {
  if (recurrence === 'none') return null
  if (recurrence === 'weekly') {
    const dow = ['SU','MO','TU','WE','TH','FR','SA'][new Date(date).getDay()]
    return `RRULE:FREQ=WEEKLY;BYDAY=${dow}`
  }
  if (recurrence === 'monthly') return 'RRULE:FREQ=MONTHLY'
  return null
}
function consequenceSentence(recurrence: string, date: string, venue: string, reminderMin: number): string {
  const d = new Date(date)
  const weekday = DOW[d.getDay()]
  let line = ''
  if (recurrence === 'none')    line = `Will appear once on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.`
  if (recurrence === 'weekly')  line = `Will appear every ${weekday}.`
  if (recurrence === 'monthly') line = `Will appear monthly on the ${d.getDate()}.`
  const venueNote = venue ? ` At ${venue}.` : ''
  const remNote = reminderMin >= 1440
    ? ` Reminder ${Math.round(reminderMin / 1440)} day(s) before.`
    : ` Reminder ${reminderMin} min before.`
  return line + venueNote + remNote
}

// Event dot colors
function eventColor(ev: CalEvent) {
  if (ev.is_festival) return 'bg-amber-400'
  if (!ev.group_id)   return 'bg-brand-900'
  const t = ev.groups?.group_type
  if (t === 'prayer') return 'bg-amber-600'
  if (t === 'youth')  return 'bg-blue-500'
  return 'bg-emerald-600'
}

// ─────────────────────────────────────────────────────────────
// EventSheet
// ─────────────────────────────────────────────────────────────
function EventSheet({
  date, templates, prayerGroups, familyUnits, onClose, currentUserId,
}: {
  date: string
  templates: Template[]
  prayerGroups: PrayerGroup[]
  familyUnits: FamilyUnit[]
  onClose: () => void
  currentUserId: string
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [title, setTitle]           = useState('')
  const [titleMl, setTitleMl]       = useState('')
  const [time, setTime]             = useState('08:30')
  const [endTime, setEndTime]       = useState('')
  const [venue, setVenue]           = useState('')
  const [visibility, setVisibility] = useState<'public'|'members'>('public')
  const [recurrence, setRecurrence] = useState<'none'|'weekly'|'monthly'>('none')
  const [isFestival, setIsFestival] = useState(false)
  const [reminderMin, setReminderMin] = useState(1440)
  const [prayerGroupId, setPrayerGroupId] = useState('')
  const [hostFamilyId, setHostFamilyId]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [mlLoading, setMlLoading]   = useState(false)
  const titleEnRef = useRef<HTMLInputElement>(null)

  const isPrayerMeeting = selectedTemplate?.group_type_hint === 'prayer'
  const filteredFamilies = familyUnits.filter(f => f.prayer_group_id === prayerGroupId)

  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white'

  async function handleTransliterate() {
    const text = titleEnRef.current?.value ?? ''
    if (!text) return
    setMlLoading(true)
    const res = await fetch(`/api/transliterate?text=${encodeURIComponent(text)}`)
    const json = await res.json()
    if (json.result) setTitleMl(json.result)
    setMlLoading(false)
  }

  function applyTemplate(t: Template) {
    setSelectedTemplate(t)
    setTitle(t.name)
    setTitleMl(t.name_ml ?? '')
    setTime(t.default_time ?? '08:30')
    setVenue(t.default_venue ?? '')
    setVisibility(t.default_visibility as 'public'|'members')
    setReminderMin(t.default_reminder_minutes)
    if (t.recurrence_suggestion?.includes('WEEKLY')) setRecurrence('weekly')
    else if (t.recurrence_suggestion?.includes('MONTHLY')) setRecurrence('monthly')
    else setRecurrence('none')
    setIsFestival(t.name.toLowerCase().includes('festival') || t.name.toLowerCase().includes('perunnal'))
    // Reset prayer-meeting specific fields when switching templates
    if (t.group_type_hint !== 'prayer') { setPrayerGroupId(''); setHostFamilyId('') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title required'); return }
    if (isPrayerMeeting && !prayerGroupId) { setError('Select a Prayer Group (Bhagam)'); return }
    if (isPrayerMeeting && !hostFamilyId) { setError('Select the Host Family'); return }
    setSaving(true); setError(null)
    const startsAt = buildStartsAt(date, time)
    const endsAt   = endTime ? buildStartsAt(date, endTime) : null
    // For prayer meeting, venue = host family house name
    const hostFamily = familyUnits.find(f => f.id === hostFamilyId)
    const resolvedVenue = isPrayerMeeting && hostFamily
      ? `${hostFamily.house_name_ml ? hostFamily.house_name_ml + ' — ' : ''}${hostFamily.house_name}`
      : venue
    const fd = new FormData()
    fd.set('title', title)
    fd.set('title_ml', titleMl)
    fd.set('starts_at', startsAt)
    if (endsAt) fd.set('ends_at', endsAt)
    fd.set('venue', resolvedVenue)
    fd.set('visibility', visibility)
    fd.set('is_festival', String(isFestival))
    if (isPrayerMeeting && prayerGroupId) fd.set('group_id', prayerGroupId)
    if (isPrayerMeeting && hostFamilyId)  fd.set('host_family_id', hostFamilyId)
    const rrule = buildRRule(recurrence, date)
    if (rrule) fd.set('rrule', rrule)
    fd.set('reminder_minutes', String(reminderMin))
    const result = await createEvent(fd)
    setSaving(false)
    if ('error' in result) { setError(result.error); return }
    onClose()
  }

  const dispDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const consequence = title ? consequenceSentence(recurrence, date, venue, reminderMin) : null

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-black/40 absolute inset-0" onClick={onClose} />
      {/* Sheet */}
      <div className="relative bg-white w-full lg:w-[420px] max-h-[90vh] lg:max-h-full overflow-y-auto rounded-t-2xl lg:rounded-none shadow-2xl z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">New Event</p>
            <p className="text-sm font-bold text-brand-900">{dispDate}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>

        {/* Template chips */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Quick templates</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {templates.map(t => (
              <button key={t.id} type="button"
                onClick={() => applyTemplate(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  selectedTemplate?.id === t.id
                    ? 'bg-brand-900 text-white border-brand-900'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}>
                {t.name_ml ?? t.name}
              </button>
            ))}
            <button type="button"
              onClick={() => { setSelectedTemplate(null); setTitle(''); setTitleMl(''); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                !selectedTemplate ? 'bg-brand-900 text-white border-brand-900' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}>
              <Plus size={12} className="inline mr-1" />Custom
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 pt-2 pb-6 space-y-3 flex-1">

          {/* Prayer Meeting: Bhagam + Host Family — only when group_type_hint = 'prayer' */}
          {isPrayerMeeting && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-[10px] font-bold text-amber-800 uppercase">Prayer Meeting Details</p>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Bhagam / Prayer Group *</label>
                <select value={prayerGroupId} onChange={e => { setPrayerGroupId(e.target.value); setHostFamilyId('') }}
                  className={inp}>
                  <option value="">Select Bhagam…</option>
                  {prayerGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name_ml ? `${g.name_ml} — ` : ''}{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                  Host Family *
                  {prayerGroupId && filteredFamilies.length === 0 && (
                    <span className="ml-2 text-red-500 font-normal normal-case">No families linked to this Bhagam yet</span>
                  )}
                </label>
                <select value={hostFamilyId} onChange={e => setHostFamilyId(e.target.value)}
                  disabled={!prayerGroupId} className={`${inp} disabled:opacity-50`}>
                  <option value="">Select host family…</option>
                  {filteredFamilies.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.house_name_ml ? `${f.house_name_ml} — ` : ''}{f.house_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Title (English) *</label>
              <input ref={titleEnRef} value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Holy Qurbana" className={inp} />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-semibold text-amber-600 uppercase">Title (Malayalam)</label>
                <button type="button" onClick={handleTransliterate} disabled={mlLoading}
                  className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-50">
                  {mlLoading ? 'Transliterating…' : 'Type → മലയാളം'}
                </button>
              </div>
              <input value={titleMl} onChange={e => setTitleMl(e.target.value)} placeholder="വിശുദ്ധ കുർബാന" className={`${inp} font-malayalam`} lang="ml" />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Start Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Venue — hidden for prayer meeting (auto-set to host family) */}
          {!isPrayerMeeting && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Venue</label>
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Church, Parish Hall…" className={inp} />
            </div>
          )}

          {/* Visibility */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value as 'public'|'members')} className={inp}>
                <option value="public">Public</option>
                <option value="members">Members only</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Recurrence</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value as typeof recurrence)} className={inp}>
                <option value="none">Doesn&apos;t repeat</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Reminder</label>
            <select value={reminderMin} onChange={e => setReminderMin(Number(e.target.value))} className={inp}>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={360}>6 hours before</option>
              <option value={1440}>1 day before</option>
              <option value={2880}>2 days before</option>
            </select>
          </div>

          {/* Festival toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isFestival} onChange={e => setIsFestival(e.target.checked)}
              className="accent-brand-900 w-4 h-4" />
            <span className="text-sm">Mark as Festival / Perunnal</span>
          </label>

          {/* Consequence sentence */}
          {consequence && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-[11px] text-amber-800 font-medium">{consequence}</p>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 disabled:opacity-50 transition-colors">
            {saving ? 'Adding…' : 'Add to Calendar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Day cell events preview
// ─────────────────────────────────────────────────────────────
function DayEventDots({ evs }: { evs: CalEvent[] }) {
  const maxDots = 3
  const shown = evs.slice(0, maxDots)
  return (
    <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
      {shown.map(e => (
        <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${eventColor(e)}`} />
      ))}
      {evs.length > maxDots && (
        <span className="text-[8px] text-muted-foreground leading-none">+{evs.length - maxDots}</span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Day detail popover (click on event)
// ─────────────────────────────────────────────────────────────
function DayDetail({ day, evs, onClose, isAdmin, currentUserId }: {
  day: string; evs: CalEvent[]; onClose: () => void
  isAdmin: boolean; currentUserId: string
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const dispDate = new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteEvent(id)
    setDeleting(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-black/40 absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-h-[70vh] overflow-y-auto rounded-t-2xl shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <p className="text-sm font-bold text-brand-900">{dispDate}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>
        <div className="divide-y">
          {evs.map(ev => (
            <div key={ev.id} className={`px-5 py-3 flex items-start justify-between gap-3 ${ev.is_festival ? 'bg-amber-50' : ''}`}>
              <div className="flex gap-3 min-w-0">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${eventColor(ev)}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{ev.title}</p>
                  {ev.title_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{ev.title_ml}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(ev.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                    {ev.groups ? ` · ${ev.groups.name_ml ?? ev.groups.name}` : ''}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(ev.id)} disabled={deleting === ev.id}
                  className="text-[10px] text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50">
                  {deleting === ev.id ? '…' : 'Delete'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main CalendarClient
// ─────────────────────────────────────────────────────────────
export default function CalendarClient({
  events, templates, prayerGroups, familyUnits, isAdmin, currentUserId, serverDate,
}: {
  events: CalEvent[]
  templates: Template[]
  prayerGroups: PrayerGroup[]
  familyUnits: FamilyUnit[]
  isAdmin: boolean
  currentUserId: string
  serverDate: string   // 'YYYY-MM-DD' — passed from server to avoid hydration mismatch
}) {
  const d = new Date(serverDate + 'T00:00:00')
  const [year, setYear]   = useState(d.getFullYear())
  const [month, setMonth] = useState(d.getMonth())
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)

  // Map events to date keys
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      const key = ev.starts_at.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  const cells = getMonthDays(year, month)
  const todayStr = serverDate  // stable — same on server and client

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(day: number) {
    const dateStr = toDateStr(year, month, day)
    const dayEvents = eventsByDate.get(dateStr) ?? []
    if (dayEvents.length > 0) {
      setDetailDate(dateStr)
    } else if (isAdmin) {
      setSheetDate(dateStr)
    }
  }

  function handleDayLongPress(day: number) {
    if (!isAdmin) return
    setSheetDate(toDateStr(year, month, day))
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-brand-900">
          {MONTHS[month]} {year}
        </h1>
        <button onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Admin prompt */}
      {isAdmin && (
        <p className="text-[11px] text-muted-foreground text-center mb-3">
          Tap an empty date to add an event
        </p>
      )}

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = toDateStr(year, month, day)
          const dayEvs  = eventsByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const hasFestival = dayEvs.some(e => e.is_festival)

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex flex-col items-center justify-start py-1 rounded-xl min-h-[48px] transition-colors
                ${isToday ? 'ring-2 ring-brand-900' : ''}
                ${hasFestival ? 'bg-amber-50' : ''}
                ${isAdmin && dayEvs.length === 0 ? 'hover:bg-brand-900/5 cursor-pointer' : ''}
                ${dayEvs.length > 0 ? 'hover:bg-gray-50 cursor-pointer' : isAdmin ? '' : 'cursor-default'}
              `}
            >
              <span className={`
                text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium
                ${isToday ? 'bg-brand-900 text-white' : 'text-gray-800'}
              `}>
                {day}
              </span>
              <DayEventDots evs={dayEvs} />
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-6 px-1">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-brand-900" /> Parish
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-amber-600" /> Prayer Group
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Group
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Festival
        </span>
      </div>

      {/* Upcoming list */}
      <div className="mt-8 space-y-2">
        <h2 className="text-base font-bold text-brand-900 mb-3">Upcoming Events</h2>
        {events.filter(ev => ev.starts_at >= serverDate).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming events</p>
        ) : (
          events
            .filter(ev => ev.starts_at >= serverDate)
            .slice(0, 10)
            .map(ev => (
              <div key={ev.id} className={`rounded-xl border px-4 py-3 shadow-sm flex gap-3 items-start ${ev.is_festival ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${eventColor(ev)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{ev.title}</p>
                  {ev.title_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{ev.title_ml}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(ev.starts_at).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                    {' '}·{' '}
                    {new Date(ev.starts_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Add button for admin (always visible) */}
      {isAdmin && (
        <button
          onClick={() => setSheetDate(todayStr)}
          className="fixed bottom-24 right-4 w-12 h-12 bg-brand-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-800 transition-colors z-40"
          title="Add event"
        >
          <Plus size={22} />
        </button>
      )}

      {/* Event entry sheet */}
      {sheetDate && (
        <EventSheet
          date={sheetDate}
          templates={templates}
          prayerGroups={prayerGroups}
          familyUnits={familyUnits}
          onClose={() => setSheetDate(null)}
          currentUserId={currentUserId}
        />
      )}

      {/* Day detail sheet */}
      {detailDate && (
        <DayDetail
          day={detailDate}
          evs={eventsByDate.get(detailDate) ?? []}
          onClose={() => setDetailDate(null)}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
