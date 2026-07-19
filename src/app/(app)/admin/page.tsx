import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Group } from '@/types/database'
import {
  approveProfile, declineProfile, toggleAdmin,
  archiveGroup, unarchiveGroup,
  postAnnouncement,
} from './actions'
import { approveClaim, denyClaim } from '@/app/auth/claim/actions'
import BilingualPostComposer from '@/components/posts/BilingualPostComposer'
import type { GroupOption } from '@/components/posts/BilingualPostComposer'
import CreateGroupForm from './CreateGroupForm'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!(me as Profile | null)?.is_admin) redirect('/')

  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString()
  const todayISOStr = new Date().toISOString().slice(0, 10)
  const [
    { count: totalMembers },
    { count: pendingCount },
    { count: groupCount },
    { count: upcomingEvents },
    { data: pendingRaw },
    { data: claimsRaw },
    { data: membersRaw },
    { data: groupsRaw },
    { data: profilesRaw },
  ] = await Promise.all([
    supabase.from('family_units').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('starts_at', todayISOStr).lte('starts_at', weekFromNow),
    supabase.from('profiles').select('*').eq('status', 'pending').eq('claim_status', 'unclaimed').order('created_at'),
    supabase.from('profiles')
      .select('id, phone, display_name, family_member_id, family_members!family_member_id(full_name, full_name_ml, relation_to_head, family_units(house_name, groups!prayer_group_id(name, name_ml)))')
      .eq('claim_status', 'pending_claim')
      .order('created_at'),
    supabase.from('family_units').select('id, house_name, house_name_ml, family_members(id, full_name, full_name_ml, relation_to_head, is_deceased, profile_id)').order('house_name'),
    supabase.from('groups').select('id,name,name_ml,slug,group_type,is_archived').order('name'),
    supabase.from('profiles').select('id, phone, is_admin, status').in('status', ['active','disabled']),
  ])

  const pending      = (pendingRaw  as Profile[] | null) ?? []
  const claims       = (claimsRaw   as unknown[]) ?? []
  const families     = (membersRaw as unknown as { id: string; house_name: string; house_name_ml: string | null; family_members: unknown[] }[] | null) ?? []
  type ProfEntry = { id: string; phone: string; is_admin: boolean; status: string }
  const profileMap   = new Map(((profilesRaw as ProfEntry[] | null) ?? []).map(p => [p.id, p]))
  const groups       = (groupsRaw   as Pick<Group,'id'|'name'|'name_ml'|'slug'|'group_type'|'is_archived'>[] | null) ?? []
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

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/registry',  label: '🏠 Registry',   desc: 'Households & life events' },
          { href: '/admin/approvals', label: '📝 Approvals',  desc: 'Change request queue' },
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Member Families', value: totalMembers  ?? 0 },
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

      {/* ── Claims Queue ── */}
      {claims.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-900 mb-3 flex items-center gap-2">
            Identity Claims
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{claims.length}</span>
          </h2>
          <div className="space-y-2">
            {(claims as Record<string, unknown>[]).map(c => {
              const fm = c.family_members as Record<string, unknown> | null
              const fu = fm?.family_units as Record<string, unknown> | null
              const g  = fu?.groups as Record<string, unknown> | null
              return (
                <div key={c.id as string} className="bg-white rounded-xl border border-blue-100 px-4 py-3 shadow-sm space-y-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{c.phone as string}</p>
                    <p className="text-xs text-muted-foreground">
                      Claiming: {fm?.full_name as string}
                      {fm?.relation_to_head ? ` (${fm.relation_to_head})` : ''}
                      {fu?.house_name ? ` · ${fu.house_name}` : ''}
                      {g?.name_ml ? ` · ${g.name_ml}` : g?.name ? ` · ${g.name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => { 'use server'; await approveClaim(c.id as string) }} className="flex-1">
                      <button className={`w-full ${btn} bg-green-600 text-white hover:bg-green-700`}>Approve</button>
                    </form>
                    <form action={async () => { 'use server'; await denyClaim(c.id as string) }} className="flex-1">
                      <button className={`w-full ${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Deny</button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Pending Approvals ── */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-900 mb-3 flex items-center gap-2">
            Pending Approvals
            <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          </h2>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm space-y-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{p.full_name}</p>
                  {p.full_name_ml && <p className="text-xs text-muted-foreground font-malayalam" lang="ml">{p.full_name_ml}</p>}
                  <p className="text-xs text-muted-foreground">{p.phone}{p.house_name ? ` · ${p.house_name}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveProfile.bind(null, p.id)} className="flex-1">
                    <button className={`w-full ${btn} bg-green-600 text-white hover:bg-green-700`}>Approve</button>
                  </form>
                  <form action={declineProfile.bind(null, p.id)} className="flex-1">
                    <button className={`w-full ${btn} bg-red-100 text-red-700 hover:bg-red-200`}>Decline</button>
                  </form>
                </div>
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
        <CreateGroupForm />

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

      {/* ── Member Families ── */}
      <section>
        <h2 className="text-lg font-bold text-brand-900 mb-3">Member Families ({families.length})</h2>
        <div className="space-y-2">
          {families.map(fam => {
            type FM = { id: string; full_name: string; full_name_ml: string | null; relation_to_head: string | null; is_deceased: boolean; profile_id: string | null }
            const mems = (fam.family_members as unknown as FM[]) ?? []
            const head = mems.find(m => m.relation_to_head === 'head') ?? mems[0] ?? null
            const headProf = head?.profile_id ? (profileMap.get(head.profile_id) ?? null) : null
            return (
              <details key={fam.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none hover:bg-amber-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-sm">{head?.full_name ?? fam.house_name}</p>
                      {head && <span className={`${badge} bg-amber-100 text-amber-800 border border-amber-200`}>Head of Family</span>}
                      {headProf?.is_admin && <span className={`${badge} bg-brand-900 text-white`}>Admin</span>}
                      {headProf?.status === 'disabled' && <span className={`${badge} bg-gray-200 text-gray-500`}>Disabled</span>}
                    </div>
                    {headProf && <p className="text-xs text-muted-foreground mt-0.5">{headProf.phone}</p>}
                    <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{fam.house_name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{mems.length} {mems.length === 1 ? 'member' : 'members'} ›</span>
                </summary>
                <div className="border-t border-amber-50 divide-y divide-amber-50 px-4 py-2 space-y-0">
                  {mems.map(m => {
                    const prof = m.profile_id ? (profileMap.get(m.profile_id as string) ?? null) : null
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-medium">{m.full_name}</p>
                            {m.relation_to_head === 'head' && <span className={`${badge} bg-amber-100 text-amber-800 border border-amber-200`}>Head of Family</span>}
                            {prof?.is_admin && <span className={`${badge} bg-brand-900 text-white`}>Admin</span>}
                            {m.is_deceased && <span className="text-[10px] text-gray-400">†</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {m.relation_to_head ?? 'member'}
                            {prof ? ' · ' + prof.phone : ' · not registered'}
                          </p>
                        </div>
                        {prof && prof.id !== user.id && (
                          <form action={toggleAdmin.bind(null, prof.id, !prof.is_admin)}>
                            <button className={`${btn} ${prof.is_admin ? 'bg-gray-100 text-gray-700' : 'bg-brand-50 text-brand-900 border border-brand-200'} hover:opacity-80`}>
                              {prof.is_admin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          </form>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </section>

    </div>
  )
}