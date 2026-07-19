import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import type { Profile } from '@/types/database'
import ImportPanel from './ImportPanel'
import AddMemberForm from '@/components/directory/AddMemberForm'
import DisableMemberButton from '@/components/directory/DisableMemberButton'
import { reactivateMember } from './actions'
import FamilyDirectory, { type FamilyEntry } from './FamilyDirectory'

export const metadata = { title: 'Church Directory' }

export default async function DirectoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin, status').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  const myProfile = me as Pick<Profile, 'is_admin' | 'status'> | null
  if (!myProfile || myProfile.status !== 'active') redirect('/')
  const isAdmin = !!(myProfile.is_admin || roleRow)

  // Family-based directory via security-definer RPC (bypasses family_members RLS)
  const { data: familiesRaw } = await supabase.rpc('get_family_directory')
  const families = (familiesRaw ?? []) as FamilyEntry[]

  // Admin: disabled accounts list for management
  let disabledMembers: Partial<Profile>[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, full_name_ml, phone, house_name')
      .eq('status', 'disabled')
      .order('full_name')
    disabledMembers = (data ?? []) as Partial<Profile>[]
  }

  return (
    <div className="max-w-lg md:max-w-4xl mx-auto px-4 py-6 space-y-5">

      <div>
        <h1 className="text-2xl font-bold text-brand-900">Church Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {families.length} {families.length === 1 ? 'family' : 'families'} · tap a card to see details
        </p>
      </div>

      {/* Admin tools */}
      {isAdmin && (
        <div className="grid sm:grid-cols-2 gap-4">
          <AddMemberForm />
          <ImportPanel />
        </div>
      )}

      {/* Family-based directory — client component handles search + expand */}
      <FamilyDirectory families={families} isAdmin={isAdmin} />

      {/* Disabled accounts — admin only */}
      {isAdmin && disabledMembers.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs font-semibold text-red-500 cursor-pointer select-none py-1">
            {disabledMembers.length} disabled account{disabledMembers.length > 1 ? 's' : ''}
          </summary>
          <div className="space-y-2 mt-2">
            {disabledMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 opacity-70">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-bold">{(m.full_name ?? '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate line-through text-muted-foreground">{m.full_name}</p>
                  {m.house_name && <p className="text-xs text-muted-foreground">{m.house_name}</p>}
                  <p className="text-xs text-muted-foreground">{m.phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/directory/${m.id}`} className="text-amber-500 hover:text-amber-700" title="Edit">
                    <Pencil size={15} />
                  </Link>
                  <form action={reactivateMember.bind(null, m.id!)}>
                    <button type="submit" className="text-[11px] text-green-600 hover:text-green-800 font-semibold border border-green-200 rounded-lg px-2 py-1">
                      Reactivate
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
