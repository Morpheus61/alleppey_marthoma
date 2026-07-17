import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { AddMemberForm, LinkProfileButton, GroupEnrollSection, UnlinkButton, MemberLifeEvents } from './FamilyComponents'

interface Props { params: Promise<{ id: string }> }

export default async function HouseholdDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: roleRow } = await supabase.from('parish_roles')
    .select('id').eq('profile_id', user.id).in('role', ['admin','super_admin']).is('revoked_at', null).maybeSingle()
  if (!profileData?.is_admin && !roleRow) redirect('/admin')

  const { data: family } = await supabase
    .from('family_units')
    .select('*, groups!prayer_group_id(id, name, name_ml)')
    .eq('id', id)
    .single()
  if (!family) notFound()

  const { data: members } = await supabase
    .from('family_members')
    .select('id, full_name, full_name_ml, relation_to_head, date_of_birth, gender, is_deceased, profile_id, phone, email, profiles!profile_id(full_name, phone)')
    .eq('family_id', id)
    .order('relation_to_head')

  // All active profiles
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('status', 'active')
    .order('full_name')

  // Profiles already linked anywhere in the registry
  const { data: allLinkedRaw } = await supabase
    .from('family_members')
    .select('profile_id')
    .not('profile_id', 'is', null)
  const allLinkedIds = new Set((allLinkedRaw ?? []).map(m => m.profile_id as string))

  // Unlinked = registered but not yet in any household
  const unlinkedProfiles = (allProfiles ?? []).filter(p => !allLinkedIds.has(p.id))

  // All non-archived groups for enrolment
  const { data: allGroups } = await supabase
    .from('groups')
    .select('id, name, name_ml, group_type')
    .eq('is_archived', false)
    .order('group_type').order('name')

  const functionalGroups = (allGroups ?? []).filter(g => g.group_type !== 'prayer')
  const prayerGroups     = (allGroups ?? []).filter(g => g.group_type === 'prayer')

  // Current group memberships for all linked members
  const linkedProfileIds = (members ?? []).filter(m => m.profile_id).map(m => m.profile_id as string)
  const { data: currentMemberships } = linkedProfileIds.length > 0
    ? await supabase.from('group_memberships').select('group_id, user_id').in('user_id', linkedProfileIds)
    : { data: [] as { group_id: string; user_id: string }[] }

  // Life event types + events for all family members
  const { data: lifeEventTypes } = await supabase
    .from('life_event_types')
    .select('id, name, name_ml')
    .eq('is_active', true)
    .order('sort_order')

  const memberIds = (members ?? []).map(m => m.id)
  const { data: lifeEvents } = memberIds.length > 0
    ? await supabase
        .from('life_events')
        .select('id, family_member_id, event_date, event_type, life_event_type_id')
        .in('family_member_id', memberIds)
        .order('event_date')
    : { data: [] as { id: string; family_member_id: string; event_date: string | null; event_type: string | null; life_event_type_id: string | null }[] }

  const group = (family.groups as unknown as { id: string; name: string; name_ml: string | null } | null)
  const membersForEnrol = (members ?? []).map(m => ({
    id: m.id,
    full_name: m.full_name,
    relation_to_head: m.relation_to_head,
    profile_id: m.profile_id,
  }))

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/registry" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Registry</Link>
        <h1 className="text-2xl font-bold text-brand-900">{family.house_name}</h1>
        {family.house_name_ml && <p className="font-malayalam text-muted-foreground" lang="ml">{family.house_name_ml}</p>}
        {family.address && <p className="text-sm text-muted-foreground mt-0.5">{family.address}</p>}
        {group && (
          <span className="inline-block mt-2 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            📍 {group.name_ml ?? group.name}
          </span>
        )}
      </div>

      {/* ── Unlinked registered members — Feature 1 ── */}
      {unlinkedProfiles.length > 0 && (
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
            {unlinkedProfiles.length} registered member{unlinkedProfiles.length > 1 ? 's' : ''} not yet in any household
          </p>
          <p className="text-[11px] text-amber-700">Add them as family members below and link their account.</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {unlinkedProfiles.slice(0, 8).map(p => (
              <span key={p.id} className="text-[11px] bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-900 font-medium">
                {p.full_name} · {p.phone}
              </span>
            ))}
            {unlinkedProfiles.length > 8 && (
              <span className="text-[11px] text-amber-600">+{unlinkedProfiles.length - 8} more</span>
            )}
          </div>
        </section>
      )}

      {/* ── Family members ── */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">
          Family Members ({(members ?? []).length})
        </h2>
        <div className="space-y-2">
          {(members ?? []).map(m => {
            const linkedProfile = (m.profiles as unknown as { full_name: string; phone: string } | null)
            const memberEvents  = (lifeEvents ?? []).filter(e => e.family_member_id === m.id)
            return (
              <div key={m.id} className={`bg-white rounded-xl border px-4 py-3 shadow-sm ${m.is_deceased ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{m.full_name}
                      {m.is_deceased && <span className="ml-2 text-[10px] text-gray-400">†</span>}
                    </p>
                    {m.full_name_ml && <p className="text-xs font-malayalam text-muted-foreground" lang="ml">{m.full_name_ml}</p>}
                    <p className="text-xs text-muted-foreground capitalize">
                      {m.relation_to_head ?? '—'}
                      {m.date_of_birth ? ` · ${new Date(m.date_of_birth).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : ''}
                      {m.gender ? ` · ${m.gender}` : ''}
                    </p>
                    {(m.phone || m.email) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {m.phone && <span className="mr-2">📱 {m.phone}</span>}
                        {m.email && <span>✉ {m.email}</span>}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {linkedProfile ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                        ✓ {linkedProfile.phone}
                        <UnlinkButton memberId={m.id} familyId={id} />
                      </span>
                    ) : (
                      <LinkProfileButton
                        memberId={m.id}
                        memberName={m.full_name}
                        profiles={allProfiles ?? []}
                      />
                    )}
                  </div>
                </div>
                <MemberLifeEvents
                  memberId={m.id}
                  events={memberEvents}
                  eventTypes={lifeEventTypes ?? []}
                />
              </div>
            )
          })}

          {(members ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No family members yet — add them below.
            </p>
          )}
        </div>
      </section>

      {/* ── Add member form ── */}
      <AddMemberForm familyId={id} profiles={unlinkedProfiles} />

      {/* ── Group enrolment ── */}
      <GroupEnrollSection
        familyId={id}
        currentPrayerGroupId={(family as { prayer_group_id?: string | null }).prayer_group_id ?? null}
        members={membersForEnrol}
        functionalGroups={functionalGroups}
        prayerGroups={prayerGroups}
        currentMemberships={currentMemberships ?? []}
      />
    </div>
  )
}

