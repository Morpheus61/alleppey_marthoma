import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Calendar, User, ShieldCheck } from 'lucide-react'
import type { Profile } from '@/types/database'
import { todayIST } from '@/lib/dates'
import UpcomingEvents from './UpcomingEvents'
import HomePulpitCard from '@/components/pulpit/HomePulpitCard'
import type { PulpitMessage } from '@/lib/pulpit/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData, error: profileErr } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profileErr) console.error('[HomePage] profile error:', profileErr.message, profileErr.code)
  const p = profileData as Profile | null
  if (!p || p.status === 'pending') redirect('/auth/pending')
  if (p.status !== 'active') redirect('/auth/disabled')

  // Use start-of-today in IST so morning events remain visible all day
  const todayStr = todayIST()
  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, title, starts_at, venue, visibility')
    .gte('starts_at', todayStr)
    .order('starts_at')
    .limit(5)
  if (eventsErr) console.error('[HomePage] events error:', eventsErr.message, eventsErr.code)

  // Fetch recent parish announcements (group_id IS NULL)
  const { data: announcements, error: annoErr } = await supabase
    .from('posts')
    .select('id, title, body, created_at, is_pinned')
    .is('group_id', null)
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)
  if (annoErr) console.error('[HomePage] announcements error:', annoErr.message, annoErr.code)

  // Fetch latest Pulpit message for home card
  const { data: latestPulpit } = await supabase
    .from('pulpit_messages')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Amen count + user amen for the home card
  let pulpitMessage: PulpitMessage | null = null
  if (latestPulpit) {
    const [{ data: allAmens }, { data: userAmen }] = await Promise.all([
      supabase.from('pulpit_amens').select('user_id').eq('message_id', latestPulpit.id),
      supabase.from('pulpit_amens').select('user_id')
        .eq('message_id', latestPulpit.id).eq('user_id', user.id).maybeSingle(),
    ])
    pulpitMessage = {
      ...latestPulpit as PulpitMessage,
      amen_count: allAmens?.length ?? 0,
      user_has_amened: !!userAmen,
    }
  }

  const firstName = p.full_name.split(' ')[0]

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* ── Welcome banner ── */}
      <div className="rounded-2xl bg-brand-900 text-white px-5 py-5 shadow-lg">
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-300 mb-1">Welcome back</p>
        <p className="text-xl font-bold">{p.full_name}</p>
        {p.full_name_ml && <p className="text-sm text-brand-200 font-malayalam mt-0.5" lang="ml">{p.full_name_ml}</p>}
        <p className="text-xs text-brand-300 mt-2 italic">✦ Lighted to Lighten ✦</p>
      </div>

      {/* ── The Pulpit card ── */}
      {pulpitMessage && <HomePulpitCard message={pulpitMessage} />}

      {/* ── Quick links ── */}}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/groups',   icon: Users,       label: 'Parish Groups',  sub: 'Browse & join groups'      },
          { href: '/calendar', icon: Calendar,    label: 'Calendar',       sub: 'Events & services'          },
          { href: '/me',       icon: User,        label: 'My Profile',     sub: 'Settings & notifications'   },
          ...(p.is_admin ? [{ href: '/admin', icon: ShieldCheck, label: 'Admin Panel', sub: 'Manage the parish' }] : []),
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 bg-white rounded-xl border border-amber-100 px-4 py-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all"
          >
            <Icon size={22} className="text-brand-900" strokeWidth={1.8} />
            <div>
              <p className="font-semibold text-sm text-brand-900">{label}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Parish Announcements ── */}
      {announcements && announcements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-brand-900">Announcements</h2>
          </div>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className={`bg-white rounded-xl border px-4 py-3 shadow-sm ${a.is_pinned ? 'border-amber-300 bg-amber-50/50' : 'border-amber-100'}`}>
                {a.is_pinned && <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">📌 Pinned</p>}
                {a.title && <p className="font-semibold text-sm text-brand-900">{a.title}</p>}
                <p className="text-sm text-gray-700 mt-0.5 line-clamp-3">{a.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Events ── */}
      <UpcomingEvents events={events ?? []} />

    </div>
  )
}
