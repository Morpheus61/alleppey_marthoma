// write-roles-page-v2.cjs
// Overwrites the admin roles page.tsx with person-based picker + Convenors panel
// Run: node src/scripts/write-roles-page-v2.cjs

const fs = require('fs')
const path = require('path')

const outPath = path.join(__dirname, '../app/(app)/admin/roles/page.tsx')

const content = `import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assignRole, revokeRole, assignConvenor, removeConvenor } from '../wave2-actions'

export const metadata = { title: 'Role Management' }

const ROLE_META: Record<string, { en: string; ml: string; colour: string; access: string[] }> = {
  super_admin: {
    en: 'Vicar (Super Admin)', ml: 'വികാരി',
    colour: 'bg-brand-100 text-brand-900 border-brand-300',
    access: ['Full access — overall control', 'Approve all changes', 'Grant / revoke all roles', 'Final approval on collections'],
  },
  admin: {
    en: 'Secretary (Admin)', ml: 'സെക്രെട്ടറി',
    colour: 'bg-blue-50 text-blue-800 border-blue-200',
    access: ['Manage members & households', 'Manage groups & events', 'Parish announcements', 'Registry edits'],
  },
  treasurer: {
    en: 'Treasurer', ml: 'ഖജാഞ്ചി',
    colour: 'bg-green-50 text-green-800 border-green-200',
    access: ['Verify & approve payments', 'Record cash', 'Finance dashboard & reports', 'Arrears tracking', 'Approve Deacon cash entries'],
  },
  deacon: {
    en: 'Deacon / Collection Helper', ml: 'ഡീക്കൻ',
    colour: 'bg-amber-50 text-amber-800 border-amber-200',
    access: ['Record cash collections (submitted for Treasurer approval)', 'View own Bhagam arrears'],
  },
}

// Capitalise first letter only
function cap(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myRole } = await supabase
    .from('parish_roles').select('id')
    .eq('profile_id', user.id).eq('role', 'super_admin').is('revoked_at', null).maybeSingle()
  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!myRole && !profileData?.is_admin) redirect('/admin')

  // Current parish role holders
  const { data: activeRoles } = await supabase
    .from('parish_roles')
    .select('*, profiles!profile_id(full_name, full_name_ml, phone)')
    .is('revoked_at', null)
    .order('role').order('assigned_at')

  // Person-based picker: all active profiles with house + relation context (RPC 034)
  const { data: enrichedMembers } = await supabase
    .rpc('active_profiles_with_context')

  // Current convenors: group_memberships with role='convenor'
  const { data: convenorRows } = await supabase
    .from('group_memberships')
    .select('id, group_id, user_id, groups!group_id(name, name_ml), profiles!user_id(full_name, full_name_ml, phone)')
    .eq('role', 'convenor')
    .eq('status', 'active')
    .order('created_at')

  // All non-archived groups for the convenor picker
  const { data: allGroups } = await supabase
    .from('groups')
    .select('id, name, name_ml, group_type')
    .eq('is_archived', false)
    .order('group_type').order('name')

  type EnrichedMember = {
    id: string
    full_name: string
    full_name_ml: string | null
    phone: string
    house_name: string | null
    house_name_ml: string | null
    relation_to_head: string | null
    display_context: string | null
  }

  type ConvenorRow = {
    id: string
    group_id: string
    user_id: string
    groups: { name: string; name_ml: string | null } | null
    profiles: { full_name: string; full_name_ml: string | null; phone: string } | null
  }

  const members  = (enrichedMembers ?? []) as EnrichedMember[]
  const convRows = (convenorRows    ?? []) as unknown as ConvenorRow[]
  const groups   = (allGroups       ?? []) as { id: string; name: string; name_ml: string | null; group_type: string }[]

  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'
  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900'

  return (
    <div className="max-w-2xl md:max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div>
        <a href="/admin" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Admin Dashboard</a>
        <h1 className="text-2xl font-bold text-brand-900">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Only the Vicar (Super Admin) can grant or revoke roles.</p>
      </div>

      {/* Role hierarchy */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Role Hierarchy</h2>
        <div className="space-y-2">
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <div key={key} className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3 flex-wrap">
                <span className={\`text-[11px] font-bold px-2 py-0.5 rounded-full border \${meta.colour}\`}>{meta.en}</span>
                <span className="text-[11px] font-malayalam text-muted-foreground" lang="ml">{meta.ml}</span>
              </div>
              <ul className="mt-2 space-y-0.5">
                {meta.access.map((a, i) => (
                  <li key={i} className="text-[11px] text-gray-600">• {a}</li>
                ))}
              </ul>
            </div>
          ))}
          {/* Convenor role description */}
          <div className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">Convenor (കൺവീനർ)</span>
            </div>
            <ul className="mt-2 space-y-0.5">
              <li className="text-[11px] text-gray-600">• Create &amp; schedule events for their Prayer Group</li>
              <li className="text-[11px] text-gray-600">• Events publish directly (no re-approval needed)</li>
              <li className="text-[11px] text-gray-600">• Post announcements for their group</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Current role holders */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Current Role Holders</h2>
        <div className="space-y-2">
          {(activeRoles ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No roles assigned yet.</p>
          )}
          {(activeRoles ?? []).map(r => {
            const profile = (r.profiles as unknown as { full_name: string; full_name_ml: string | null; phone: string } | null)
            const meta = ROLE_META[r.role] ?? { en: r.role, ml: r.role, colour: 'bg-gray-100 text-gray-700 border-gray-300', access: [] }
            const isSelf = r.profile_id === user.id
            return (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {profile?.full_name}
                    {isSelf && <span className="ml-2 text-[10px] text-brand-600">(you)</span>}
                  </p>
                  {profile?.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{profile.full_name_ml}</p>}
                  <p className="text-xs text-muted-foreground">{profile?.phone}</p>
                </div>
                <span className={\`text-[11px] font-bold px-2 py-0.5 rounded-full border \${meta.colour}\`}>{meta.en}</span>
                {!isSelf && (
                  <form action={revokeRole}>
                    <input type="hidden" name="roleId" value={r.id} />
                    <button className={\`\${btn} bg-red-50 text-red-700 hover:bg-red-100\`}>Revoke</button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Assign a Role */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Assign a Role</h2>
        <form action={assignRole} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Member</label>
              <select name="profile_id" required className={inp}>
                <option value="">Select member…</option>
                {members.map(m => {
                  const label = m.full_name
                    + (m.full_name_ml ? ' / ' + m.full_name_ml : '')
                    + (m.display_context ? ' · ' + m.display_context : '')
                    + ' (' + m.phone + ')'
                  return (
                    <option key={m.id} value={m.id}>{label}</option>
                  )
                })}
              </select>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Shows all active accounts — any family member, not only heads.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Role</label>
              <select name="role" required className={inp}>
                <option value="">Select role…</option>
                {Object.entries(ROLE_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.en}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={\`w-full \${btn} bg-brand-900 text-white hover:bg-brand-800 py-2.5\`}>
            Assign Role
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            All role assignments are audit-logged. A role can only be revoked, not deleted.
          </p>
        </form>
      </section>

      {/* Convenors (കൺവീനർ) panel */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-1">Convenors (കൺവീനർ)</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Convenors manage events and posts for their Prayer Group. Any active member — not only the household head — may be appointed.
        </p>

        {/* Current convenors */}
        {convRows.length > 0 && (
          <div className="space-y-2 mb-4">
            {convRows.map(c => {
              const profile = c.profiles
              const group   = c.groups
              return (
                <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl border border-purple-100 px-4 py-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{profile?.full_name}</p>
                    {profile?.full_name_ml && (
                      <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{profile.full_name_ml}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {profile?.phone}
                      {group ? ' · ' + (group.name_ml ?? group.name) : ''}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200">
                    കൺവീനർ
                  </span>
                  <form action={removeConvenor}>
                    <input type="hidden" name="membershipId" value={c.id} />
                    <input type="hidden" name="profileId"    value={c.user_id} />
                    <input type="hidden" name="groupId"      value={c.group_id} />
                    <button className={\`\${btn} bg-red-50 text-red-700 hover:bg-red-100\`}>Remove</button>
                  </form>
                </div>
              )
            })}
          </div>
        )}

        {/* Appoint new convenor */}
        <form action={assignConvenor} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Appoint Convenor</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Member</label>
              <select name="profile_id" required className={inp}>
                <option value="">Select member…</option>
                {members.map(m => {
                  const label = m.full_name
                    + (m.full_name_ml ? ' / ' + m.full_name_ml : '')
                    + (m.display_context ? ' · ' + m.display_context : '')
                    + ' (' + m.phone + ')'
                  return (
                    <option key={m.id} value={m.id}>{label}</option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Group</label>
              <select name="group_id" required className={inp}>
                <option value="">Select group…</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name_ml ? g.name_ml + ' — ' : ''}{g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={\`w-full \${btn} bg-purple-700 text-white hover:bg-purple-800 py-2.5\`}>
            Appoint as Convenor
          </button>
        </form>
      </section>
    </div>
  )
}
`

fs.writeFileSync(outPath, content, 'utf8')
console.log('Wrote', outPath)
