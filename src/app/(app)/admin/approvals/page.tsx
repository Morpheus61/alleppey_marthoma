import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ChangeRequest, Profile } from '@/types/database'
import { approveChangeRequest, rejectChangeRequest } from '../wave2-actions'

export const metadata = { title: 'Approvals Queue' }

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myRole } = await supabase
    .from('parish_roles').select('id')
    .eq('profile_id', user.id).eq('role', 'super_admin').is('revoked_at', null).maybeSingle()
  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!myRole && !profileData?.is_admin) redirect('/admin')

  const { data: pendingRaw } = await supabase
    .from('change_requests')
    .select('*, profiles!requested_by(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const { data: recentRaw } = await supabase
    .from('change_requests')
    .select('*, profiles!requested_by(full_name, phone)')
    .in('status', ['approved', 'rejected'])
    .order('reviewed_at', { ascending: false })
    .limit(20)

  const pending = (pendingRaw ?? []) as (ChangeRequest & { profiles: Pick<Profile, 'full_name' | 'phone'> | null })[]
  const recent  = (recentRaw  ?? []) as (ChangeRequest & { profiles: Pick<Profile, 'full_name' | 'phone'> | null })[]

  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[36px] transition-colors'

  function renderDiff(req: ChangeRequest) {
    const current  = (req.current_data  as Record<string, unknown>) ?? {}
    const proposed = (req.proposed_data as Record<string, unknown>) ?? {}
    const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(proposed)]))
    return keys
      .filter(k => current[k] !== proposed[k])
      .map(k => (
        <p key={k} className="text-xs">
          <span className="font-semibold capitalize">{k.replace(/_/g,' ')}: </span>
          <span className="line-through text-red-500">{String(current[k] ?? '—')}</span>
          {' → '}
          <span className="text-green-700 font-medium">{String(proposed[k] ?? '—')}</span>
        </p>
      ))
  }

  return (
    <div className="max-w-2xl md:max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Approvals Queue</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pending.length} pending · Vicar approval required for all changes
        </p>
      </div>

      {pending.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          ✓ No pending approvals
        </div>
      )}

      {pending.map(req => (
        <div key={req.id} className="bg-white rounded-xl border border-amber-200 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">
                {req.change_type === 'update' ? 'Edit' : req.change_type} — {req.target_table.replace(/_/g,' ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested by {req.profiles?.full_name} ({req.profiles?.phone}) ·{' '}
                {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">Pending</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            {renderDiff(req)}
          </div>

          <div className="flex gap-2">
            <form action={approveChangeRequest.bind(null, req.id)} className="flex-1">
              <button className={`w-full ${btn} bg-green-600 text-white hover:bg-green-700`}>
                ✓ Approve
              </button>
            </form>
            <form action={rejectChangeRequest} className="flex-1 space-y-1">
              <input type="hidden" name="requestId" value={req.id} />
              <input name="remarks" placeholder="Reason for rejection…"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-900" />
              <button className={`w-full ${btn} bg-red-50 text-red-700 hover:bg-red-100`}>
                ✗ Reject
              </button>
            </form>
          </div>
        </div>
      ))}

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Recent Decisions</h2>
          <div className="space-y-2">
            {recent.map(req => (
              <div key={req.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border px-4 py-2">
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-medium">{req.change_type} {req.target_table.replace(/_/g,' ')}</span>
                  {' · '}{req.profiles?.full_name}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
