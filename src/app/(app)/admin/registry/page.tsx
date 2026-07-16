import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Parish Registry' }

export default async function RegistryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!profileData?.is_admin && !roleRow) redirect('/admin')

  const { data: families } = await supabase
    .from('family_units')
    .select('id, house_name, house_name_ml, address, prayer_group_id, groups!prayer_group_id(name, name_ml)')
    .order('house_name')

  const { data: memberCounts } = await supabase
    .from('family_members')
    .select('family_id')

  const countByFamily = (memberCounts ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.family_id] = (acc[row.family_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Parish Registry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{families?.length ?? 0} households registered</p>
        </div>
        <Link href="/admin/registry/new"
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-900 text-white hover:bg-brand-800 transition-colors">
          + Add Household
        </Link>
      </div>

      {(!families || families.length === 0) && (
        <div className="text-center py-16 space-y-2">
          <p className="text-muted-foreground">No households registered yet.</p>
          <p className="text-xs text-muted-foreground">Run migration 012 in Supabase, then use "Add Household" or bulk import to populate.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(families ?? []).map(f => {
          const group = (f.groups as unknown as { name: string; name_ml?: string | null } | null)
          const count = countByFamily[f.id] ?? 0
          return (
            <Link key={f.id} href={`/admin/registry/${f.id}`}
              className="bg-white rounded-xl border border-amber-50 px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-semibold text-sm">{f.house_name}</p>
              {f.house_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{f.house_name_ml}</p>}
              {f.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{f.address}</p>}
              <div className="flex items-center gap-2 mt-2">
                {group && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{group.name_ml ?? group.name}</span>}
                <span className="text-[10px] text-muted-foreground">{count} member{count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
