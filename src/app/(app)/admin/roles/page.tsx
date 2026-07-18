import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'
import { assignRole, revokeRole } from '../wave2-actions'

export const metadata = { title: 'Role Management' }

const ROLE_META: Record<string, { en: string; ml: string; colour: string; access: string[] }> = {
  super_admin: {
    en: 'Vicar (Super Admin)', ml: 'വികാരി',
    colour: 'bg-brand-100 text-brand-900 border-brand-300',
    access: ['Full access', 'Approve all changes', 'Grant/revoke all roles', 'Final approval on collections'],
  },
  admin: {
    en: 'Secretary (Admin)', ml: 'സെക്രട്ടറി',
    colour: 'bg-blue-50 text-blue-800 border-blue-200',
    access: ['Manage members & households', 'Manage groups & events', 'Parish announcements', 'Registry edits'],
  },
  treasurer: {
    en: 'Treasurer', ml: 'ഖജാഞ്ചി',
    colour: 'bg-green-50 text-green-800 border-green-200',
    access: ['Verify & approve payments', 'Record cash', 'Finance dashboard', 'Arrears reports', 'Approve Deacon cash entries'],
  },
  deacon: {
    en: 'Deacon / Collection Helper', ml: 'ഡീക്കൻ',
    colour: 'bg-amber-50 text-amber-800 border-amber-200',
    access: ['Record cash collections (submitted for Treasurer approval)', 'View own Bhagam arrears'],
  },
}

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myRole } = await supabase
    .from('parish_roles').select('id')
    .eq('profile_id', user.id).eq('role', 'super_admin').is('revoked_at', null).maybeSingle()
  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()

  const { data: activeRoles } = await supabase
    .from('parish_roles')
    .select('*, profiles!profile_id(full_name, full_name_ml, phone)')
    .is('revoked_at', null)
    .order('role').order('assigned_at')

  const { data: allMembers } = await supabase
    .from('profiles')
    .select('id, full_name, full_name_ml, phone')
    .eq('status', 'active')
    .order('full_name')

  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'

  return (
    <div className="max-w-2xl md:max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Only the Vicar (Super Admin) can grant or revoke roles.</p>
      </div>

      {/* Role hierarchy reference */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Role Hierarchy</h2>
        <div className="space-y-2">
          {Object.entries(ROLE_META).map(([key, meta]) => (
            <div key={key} className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={}>{meta.en}</span>
                <span className="text-[11px] font-malayalam text-muted-foreground" lang="ml">{meta.ml}</span>
              </div>
              <ul className="mt-2 space-y-0.5">
                {meta.access.map((a, i) => (
                  <li key={i} className="text-[11px] text-gray-600">&#x2022; {a}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Active role holders */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Current Role Holders</h2>
        <div className="space-y-2">
          {(activeRoles ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No roles assigned yet.</p>
          )}
          {(activeRoles ?? []).map(r => {
            const profile = (r.profiles as unknown as Pick<Profile, 'full_name' | 'full_name_ml' | 'phone'> | null)
            const meta = ROLE_META[r.role] ?? { en: r.role, ml: r.role, colour: 'bg-gray-100 text-gray-700 border-gray-300', access: [] }
            const isSelf = r.profile_id === user.id
            return (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{profile?.full_name}{isSelf && <span className="ml-2 text-[10px] text-brand-600">(you)</span>}</p>
                  {profile?.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{profile.full_name_ml}</p>}
                  <p className="text-xs text-muted-foreground">{profile?.phone}</p>
                </div>
                <span className={}>{meta.en}</span>
                  <form action={revokeRole}>
                    <input type="hidden" name="roleId" value={r.id} />
                    <button className={}>Revoke</button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Grant role form */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Assign a Role</h2>
        <form action={assignRole} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Member</label>
              <select name="profile_id" required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
                <option value="">Select member&hellip;</option>
                {(allMembers ?? []).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Role</label>
              <select name="role" required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
                <option value="">Select role&hellip;</option>
                {Object.entries(ROLE_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.en}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={}>
            Assign Role
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            All role assignments are audit-logged. A role can only be revoked, not deleted.
          </p>
        </form>
      </section>
    </div>
  )
}