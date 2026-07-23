import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Group, Profile } from '@/types/database'
import { postToGroup, approveJoinRequest, declineJoinRequest, removeMember, appointLeader, revokeLeader, updateGroupInfo } from './actions'
import BilingualPostComposer from '@/components/posts/BilingualPostComposer'
import GroupEventCard from '@/components/ui/GroupEventCard'
import { todayIST } from '@/lib/dates'

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

  // Upcoming approved events — all visibility levels (leader can see members-only)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, title, title_ml, starts_at, venue, is_festival')
    .eq('group_id', group.id)
    .eq('approval_status', 'approved')
    .gte('starts_at', todayIST())
    .order('starts_at')
    .limit(8)

  const postAction       = postToGroup.bind(null, group.id)
  const editGroupAction  = updateGroupInfo.bind(null, group.id)
  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-7">

      {/* ── Header ── */}
      <div>
        <Link href="/groups" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Back to Groups</Link>
        <h1 className="text-xl font-bold text-brand-900">{group.name}</h1>
        {group.name_ml && <p className="font-malayalam text-muted-foreground text-sm mt-0.5" lang="ml">{group.name_ml}</p>}
        <div className="flex gap-3 mt-2 flex-wrap">
          <Link href={'/groups/' + group.slug + '/feed'} className="text-xs text-brand-700 underline underline-offset-2">View Feed →</Link>
          {/* Convenors / Leaders: schedule events from the parish calendar scoped to this group */}
          <Link
            href="/calendar"
            className="text-xs font-semibold bg-brand-900 text-white px-3 py-1.5 rounded-lg hover:bg-brand-800 transition-colors min-h-[30px] flex items-center"
          >
            + Schedule Event
          </Link>
        </div>
      </div>

      {/* ── Edit Group Info ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Group Info</h2>
        <form action={editGroupAction} className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 space-y-3">

          {/* Admin-only: name, name_ml, type */}
          {isAdmin && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Group Name (English)</label>
                  <input name="name" required defaultValue={group.name}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">പേര് (Malayalam)</label>
                  <input name="name_ml" defaultValue={group.name_ml ?? ''}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-malayalam focus:outline-none focus:ring-2 focus:ring-brand-900"
                    lang="ml" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Group Type</label>
                <select name="group_type" defaultValue={group.group_type}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900">
                  <option value="functional">Functional (choir, committee…)</option>
                  <option value="prayer">Prayer Group</option>
                  <option value="youth">Youth</option>
                </select>
              </div>
            </>
          )}

          {/* Description — editable by leaders and admins */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description (English)</label>
              <textarea name="description" rows={3} defaultValue={group.description ?? ''}
                placeholder="Short description of the group…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 resize-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">വിവരണം (Malayalam)</label>
              <textarea name="description_ml" rows={3} defaultValue={group.description_ml ?? ''}
                placeholder="ഇവിടെ ടൈപ്പ് ചെയ്യുക"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-malayalam focus:outline-none focus:ring-2 focus:ring-brand-900 resize-none"
                lang="ml" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Cover Image URL (optional)</label>
            <input name="cover_image_url" defaultValue={group.cover_image_url ?? ''}
              placeholder="https://…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
          </div>

          <button type="submit" className={`w-full ${btn} bg-brand-900 text-white hover:bg-brand-800 py-2.5`}>
            Save Group Info
          </button>

          {!isAdmin && (
            <p className="text-[11px] text-muted-foreground text-center">
              Group name and type can only be changed by an Admin.
            </p>
          )}
        </form>
      </section>

      {/* ── Post Composer ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Post Message</h2>
        <BilingualPostComposer
          action={postAction}
          groupName={group.name}
          showPinOption={true}
          submitLabel={'Post to ' + group.name}
        />
      </section>

      {/* ── Upcoming Events ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">Upcoming Events</h2>
        {(upcomingEvents ?? []).length > 0 ? (
          <div className="space-y-2">
            {(upcomingEvents ?? []).map(ev => (
              <GroupEventCard key={ev.id} ev={ev as import('@/components/ui/GroupEventCard').GroupEventItem} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
        )}
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
                    {/* Appoint/Revoke leader: admin-only (matches RLS WITH CHECK) */}
                    {isAdmin && (
                      m.role === 'member' ? (
                        <form action={appointLeader.bind(null, group.id, m.user_id)}>
                          <button className={`${btn} bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200`}>Make Leader</button>
                        </form>
                      ) : (
                        <form action={revokeLeader.bind(null, group.id, m.user_id)}>
                          <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Revoke Leader</button>
                        </form>
                      )
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
