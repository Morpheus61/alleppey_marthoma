import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Group, Profile } from '@/types/database'
import { postToGroup, approveJoinRequest, declineJoinRequest, removeMember, appointLeader, revokeLeader } from './actions'
import BilingualPostComposer from '@/components/posts/BilingualPostComposer'
import BilingualPostComposer from '@/components/posts/BilingualPostComposer'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('groups').select('name').eq('slug', slug).single()
  return { title: `Manage · ${data?.name ?? 'Group'}` }
}

export default async function ManagePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: groupData } = await supabase.from('groups').select('*').eq('slug', slug).single()
  const group = groupData as Group | null
  if (!group) notFound()

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = (profileData as Pick<Profile,'is_admin'> | null)?.is_admin ?? false

  const { data: myMembership } = await supabase
    .from('group_memberships').select('role').eq('group_id', group.id).eq('user_id', user.id).eq('status', 'active').single()
  const isLeader = myMembership?.role === 'leader'

  if (!isAdmin && !isLeader) redirect('/')

  // Fetch join requests
  const { data: requestsRaw } = await supabase
    .from('group_memberships')
    .select('user_id, profiles(full_name, full_name_ml, phone, house_name)')
    .eq('group_id', group.id)
    .eq('status', 'requested')

  // Fetch active members
  const { data: activeRaw } = await supabase
    .from('group_memberships')
    .select('user_id, role, profiles(full_name, full_name_ml, phone, house_name)')
    .eq('group_id', group.id)
    .eq('status', 'active')
    .order('role')

  const requests = requestsRaw ?? []
  const activeMembers = activeRaw ?? []

  const postAction = postToGroup.bind(null, group.id)
  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-7">

      {/* ── Header ── */}
      <div>
        <Link href="/groups" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Back to Groups</Link>
        <h1 className="text-xl font-bold text-brand-900">{group.name}</h1>
        {group.name_ml && <p className="font-malayalam text-muted-foreground text-sm mt-0.5" lang="ml">{group.name_ml}</p>}
        <div className="flex gap-2 mt-2">
          <Link href={`/groups/${group.slug}/feed`} className="text-xs text-brand-700 underline underline-offset-2">View Feed →</Link>
        </div>
      </div>

      {/* ── Post Composer ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Post Message</h2>
        <BilingualPostComposer
          action={postAction}
          groupName={group.name}
          showPinOption={true}
          submitLabel={`Post to ${group.name}`}
        />
      </section>

      {/* ── Join Requests ── */}
      {requests.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-brand-900 mb-3 flex items-center gap-2">
            Join Requests
            <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
          </h2>
          <div className="space-y-2">
            {requests.map(r => {
              const prof = (r.profiles as unknown as { full_name: string; full_name_ml: string | null; phone: string; house_name: string | null } | null)
              return (
                <div key={r.user_id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{prof?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{prof?.phone}{prof?.house_name ? ` · ${prof.house_name}` : ''}</p>
                  </div>
                  <form action={approveJoinRequest.bind(null, group.id, r.user_id)}>
                    <button className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Approve</button>
                  </form>
                  <form action={declineJoinRequest.bind(null, group.id, r.user_id)}>
                    <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Decline</button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Members ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Members ({activeMembers.length})</h2>
        <div className="space-y-2">
          {activeMembers.map(m => {
            const prof = (m.profiles as unknown as { full_name: string; full_name_ml: string | null; phone: string; house_name: string | null } | null)
            const isCurrentUser = m.user_id === user.id
            return (
              <div key={m.user_id} className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {prof?.full_name}
                    {m.role === 'leader' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">Leader</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{prof?.phone}</p>
                </div>
                {!isCurrentUser && (
                  <div className="flex gap-1">
                    {m.role === 'member' ? (
                      <form action={appointLeader.bind(null, group.id, m.user_id)}>
                        <button className={`${btn} bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200`}>Make Leader</button>
                      </form>
                    ) : (
                      <form action={revokeLeader.bind(null, group.id, m.user_id)}>
                        <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Revoke</button>
                      </form>
                    )}
                    <form action={removeMember.bind(null, group.id, m.user_id)}>
                      <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Remove</button>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
