import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Group } from '@/types/database'
import {
  approveProfile, declineProfile, toggleAdmin,
  createGroup, archiveGroup, unarchiveGroup,
  postAnnouncement,
} from './actions'
import BilingualPostComposer from '@/components/posts/BilingualPostComposer'
import type { GroupOption } from '@/components/posts/BilingualPostComposer'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!(me as Profile | null)?.is_admin) redirect('/')

  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString()
  const [
    { count: totalMembers },
    { count: pendingCount },
    { count: groupCount },
    { count: upcomingEvents },
    { data: pendingRaw },
    { data: membersRaw },
    { data: groupsRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('starts_at', new Date().toISOString()).lte('starts_at', weekFromNow),
    supabase.from('profiles').select('*').eq('status', 'pending').order('created_at'),
    supabase.from('profiles').select('id,full_name,full_name_ml,phone,house_name,is_admin,status').in('status', ['active','disabled']).order('full_name'),
    supabase.from('groups').select('id,name,name_ml,slug,group_type,is_archived').order('name'),
  ])

  const pending  = (pendingRaw  as Profile[] | null) ?? []
  const members  = (membersRaw  as Pick<Profile,'id'|'full_name'|'full_name_ml'|'phone'|'house_name'|'is_admin'|'status'>[] | null) ?? []
  const groups   = (groupsRaw   as Pick<Group,'id'|'name'|'name_ml'|'slug'|'group_type'|'is_archived'>[] | null) ?? []
  const activeGroups   = groups.filter(g => !g.is_archived)
  const archivedGroups = groups.filter(g => g.is_archived)

  const badge = 'text-[11px] font-semibold px-2 py-0.5 rounded-full'
  const btn   = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'

  return (
    <div className="max-w-2xl md:max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Super Admin — full access</p>
      </div>

      {/* ── Wave 2 Tools ── */}
      <section>
        <h2 className="text-lg font-bold text-brand-900 mb-1">Wave 2 Tools</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Requires migrations 011–013 to be run in Supabase. See System Definition §22.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/approvals', label: '📝 Approvals',  desc: 'Change request queue' },
            { href: '/admin/registry',  label: '🏠 Registry',   desc: 'Households & life events' },
            { href: '/admin/finance',   label: '₹ Finance',    desc: 'Dashboard & verification' },
            { href: '/admin/roles',     label: '🛡 Roles',      desc: 'Grant / revoke staff roles' },
          ].map(({ href, label, desc }) => (
            <a key={href} href={href}
              className="block rounded-xl border border-amber-100 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
              <p className="font-semibold text-sm text-brand-900">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Members',  value: totalMembers  ?? 0 },
          { label: 'Pending Approval',value: pendingCount  ?? 0, warn: (pendingCount ?? 0) > 0 },
          { label: 'Groups',          value: groupCount    ?? 0 },
          { label: 'Events This Week',value: upcomingEvents?? 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className={`rounded-xl border p-4 text-center shadow-sm ${warn ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
            <p className="text-3xl font-bold text-brand-900">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Pending Approvals ── */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-900 mb-3 flex items-center gap-2">
            Pending Approvals
            <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          </h2>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.full_name}</p>
                  {p.full_name_ml && <p className="text-xs text-muted-foreground font-malayalam" lang="ml">{p.full_name_ml}</p>}
                  <p className="text-xs text-muted-foreground">{p.phone}{p.house_name ? ` · ${p.house_name}` : ''}</p>
                </div>
                <form action={approveProfile.bind(null, p.id)}>
                  <button className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Approve</button>
                </form>
                <form action={declineProfile.bind(null, p.id)}>
                  <button className={`${btn} bg-red-100 text-red-700 hover:bg-red-200`}>Decline</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Post Parish Announcement ── */}
      <section>
        <h2 className="text-lg font-bold text-brand-900 mb-3">Post Announcement</h2>
        <BilingualPostComposer
          action={postAnnouncement}
          showGroupSelector={true}
          groupOptions={activeGroups as GroupOption[]}
          submitLabel="Post Announcement"
        />
      </section>

      {/* ── Groups ── */}
      <section>
        <h2 className="text-lg font-bold text-brand-900 mb-3">Groups</h2>

        {/* Create group form */}
        <form action={createGroup} className="bg-white rounded-xl border shadow-sm p-4 space-y-3 mb-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Create New Group</p>
          <div className="grid grid-cols-2 gap-3">
            <input name="name"    required placeholder="Group name (English)" className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
            <input name="name_ml" placeholder="പേര് (Malayalam)" className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-malayalam focus:outline-none focus:ring-2 focus:ring-brand-900" />
            <textarea name="description" rows={2} placeholder="Description (optional)" className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 resize-none" />
            <select name="group_type" className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
              <option value="functional">Functional (choir, committee…)</option>
              <option value="prayer">Prayer Group</option>
              <option value="youth">Youth</option>
            </select>
          </div>
          <button type="submit" className={`w-full ${btn} bg-brand-900 text-white hover:bg-brand-800`}>
            + Create Group
          </button>
        </form>

        {/* Active groups */}
        <div className="space-y-2">
          {activeGroups.map(g => (
            <div key={g.id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{g.name}</p>
                {g.name_ml && <p className="text-xs text-muted-foreground font-malayalam" lang="ml">{g.name_ml}</p>}
                <span className={`${badge} bg-gray-100 text-gray-600 mt-1 inline-block`}>{g.group_type}</span>
              </div>
              <Link href={`/manage/${g.slug}`} className={`${btn} bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200`}>
                Manage
              </Link>
              <form action={archiveGroup.bind(null, g.id)}>
                <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Archive</button>
              </form>
            </div>
          ))}
        </div>

        {/* Archived groups */}
        {archivedGroups.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-muted-foreground cursor-pointer select-none">
              {archivedGroups.length} archived group{archivedGroups.length > 1 ? 's' : ''}
            </summary>
            <div className="space-y-2 mt-2">
              {archivedGroups.map(g => (
                <div key={g.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                  <p className="flex-1 text-sm text-muted-foreground line-through">{g.name}</p>
                  <form action={unarchiveGroup.bind(null, g.id)}>
                    <button className={`${btn} bg-white border text-gray-700 hover:bg-gray-100`}>Restore</button>
                  </form>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* ── Members ── */}
      <section>
        <h2 className="text-lg font-bold text-brand-900 mb-3">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {m.full_name}
                  {m.is_admin && <span className={`${badge} bg-brand-900 text-white ml-2`}>Admin</span>}
                  {m.status === 'disabled' && <span className={`${badge} bg-gray-200 text-gray-500 ml-2`}>Disabled</span>}
                </p>
                <p className="text-xs text-muted-foreground">{m.phone}{m.house_name ? ` · ${m.house_name}` : ''}</p>
              </div>
              {m.id !== user.id && (
                <form action={toggleAdmin.bind(null, m.id, !m.is_admin)}>
                  <button className={`${btn} ${m.is_admin ? 'bg-gray-100 text-gray-700' : 'bg-brand-50 text-brand-900 border border-brand-200'} hover:opacity-80`}>
                    {m.is_admin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
