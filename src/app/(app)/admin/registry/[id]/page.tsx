import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { AddMemberForm, LinkProfileButton } from './FamilyComponents'

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
    .select('id, full_name, full_name_ml, relation_to_head, date_of_birth, gender, is_deceased, profile_id, profiles!profile_id(full_name, phone)')
    .eq('family_id', id)
    .order('relation_to_head')

  // Active profiles not yet linked to ANY family member — for the "link account" picker
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('status', 'active')
    .order('full_name')

  // All profiles already linked to ANY family member in the whole registry
  const { data: allLinkedRaw } = await supabase
    .from('family_members')
    .select('profile_id')
    .not('profile_id', 'is', null)
  const allLinkedIds = new Set((allLinkedRaw ?? []).map(m => m.profile_id as string))

  // Unlinked = active profile not yet attached to any household anywhere
  const unlinkedProfiles = (allProfiles ?? []).filter(p => !allLinkedIds.has(p.id))

  const group = (family.groups as unknown as { id: string; name: string; name_ml: string | null } | null)

  return (
    <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/admin/registry" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">← Registry</Link>
        <h1 className="text-2xl font-bold text-brand-900">{family.house_name}</h1>
        {family.house_name_ml && <p className="font-malayalam text-muted-foreground" lang="ml">{family.house_name_ml}</p>}
        {family.address && <p className="text-sm text-muted-foreground mt-0.5">{family.address}</p>}
        {group && (
          <span className="inline-block mt-2 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            {group.name_ml ?? group.name}
          </span>
        )}
      </div>

      {/* Family members */}
      <section>
        <h2 className="text-base font-bold text-brand-900 mb-3">
          Family Members ({(members ?? []).length})
        </h2>
        <div className="space-y-2">
          {(members ?? []).map(m => {
            const linkedProfile = (m.profiles as unknown as { full_name: string; phone: string } | null)
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
                  </div>
                  <div className="text-right shrink-0">
                    {linkedProfile ? (
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                        ✓ {linkedProfile.phone}
                      </span>
                    ) : (
                      <LinkProfileButton
                        memberId={m.id}
                        memberName={m.full_name}
                        profiles={unlinkedProfiles}
                      />
                    )}
                  </div>
                </div>
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

      {/* Add member form */}
      <AddMemberForm familyId={id} profiles={unlinkedProfiles} />
    </div>
  )
}
