import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ParishRole, Profile } from '@/types/database'
import { assignRole, revokeRole } from '../wave2-actions'

export const metadata = { title: 'Role Management' }

const ROLE_LABELS: Record<string, { en: string; ml: string; description: string }> = {
  super_admin: { en: 'Vicar (Super Admin)',  ml: 'വികാരി',   description: 'Full access. Approves all changes. Grants all roles.' },
  admin:       { en: 'Secretary (Admin)',    ml: 'സെക്രട്ടറി', description: 'Manage members, groups, announcements, events.' },
  treasurer:   { en: 'Treasurer',            ml: 'ഖജാഞ്ചി',   description: 'Verify payments, view finance dashboard.' },
  deacon:      { en: 'Deacon',               ml: 'ഡീക്കൻ',    description: 'Record cash, view arrears for their Bhagam.' },
}

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify super_admin access
  const { data: myRole } = await supabase
    .from('parish_roles')
    .select('id')
    .eq('profile_id', user.id)
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .maybeSingle()

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!myRole && !profileData?.is_admin) redirect('/admin')

  const { data: activeRoles } = await supabase
    .from('parish_roles')
    .select('*, profiles!profile_id(full_name, full_name_ml, phone)')
    .is('revoked_at', null)
    .order('assigned_at', { ascending: false })

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

      {/* Active roles */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Active Role Holders</h2>
        <div className="space-y-2">
          {(activeRoles ?? []).map(r => {
            const profile = (r.profiles as unknown as Pick<Profile, 'full_name' | 'full_name_ml' | 'phone'> | null)
            const label = ROLE_LABELS[r.role] ?? { en: r.role, ml: r.role, description: '' }
            return (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{profile?.full_name}</p>
                  {profile?.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{profile.full_name_ml}</p>}
                  <p className="text-xs text-muted-foreground">{profile?.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">{label.en}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">{label.description}</p>
                </div>
                {r.profile_id !== user.id && (
                  <form action={revokeRole.bind(null, r.id)}>
                    <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Revoke</button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Grant role form */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Grant a Role</h2>
        <form action={async (fd: FormData) => { 'use server'; await assignRole(fd.get('profile_id') as string, fd.get('role') as 'deacon' | 'treasurer' | 'admin' | 'super_admin') }}
          className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Member</label>
              <select name="profile_id" required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
                <option value="">Select member…</option>
                {(allMembers ?? []).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Role</label>
              <select name="role" required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
                {Object.entries(ROLE_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.en} — {val.description}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={`w-full ${btn} bg-brand-900 text-white hover:bg-brand-800 py-2.5`}>
            Grant Role
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            All role grants are audit-logged and cannot be deleted, only revoked.
          </p>
        </form>
      </section>
    </div>
  )
}
