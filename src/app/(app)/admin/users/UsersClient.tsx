'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { approveClaim, denyClaim } from '@/app/auth/claim/actions'
import { adminDisableUser, adminEnableUser } from './actions'
import LinkModal from './LinkModal'
import type { ProfileRow, RegistryLink } from './types'

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 30) return days + 'd ago'
  return Math.floor(days / 30) + 'mo ago'
}

function StatusBadge({ status }: { status: ProfileRow['status'] }) {
  const cls: Record<typeof status, string> = {
    pending:  'bg-amber-100 text-amber-800',
    active:   'bg-green-100 text-green-800',
    disabled: 'bg-gray-100 text-gray-400 line-through',
  }
  return (
    <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' + cls[status]}>
      {status}
    </span>
  )
}

function ClaimBadge({ cs }: { cs: ProfileRow['claim_status'] }) {
  const cls: Record<typeof cs, string> = {
    unclaimed:     'bg-gray-100 text-gray-500',
    pending_claim: 'bg-blue-100 text-blue-700',
    approved:      'bg-green-100 text-green-700',
  }
  const label: Record<typeof cs, string> = {
    unclaimed:     'unclaimed',
    pending_claim: 'pending',
    approved:      'linked',
  }
  return (
    <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' + cls[cs]}>
      {label[cs]}
    </span>
  )
}

function Dots({ profile }: { profile: ProfileRow }) {
  // POST-016: after Stage B, full_name_ml / address / date_of_birth may be dropped from profiles.
  // At that point these dots should read from family_members row instead.
  const dots = [
    { has: !!profile.full_name_ml, title: 'ML name' },
    { has: !!profile.address,      title: 'Address' },
    { has: !!profile.date_of_birth, title: 'Date of birth' },
  ]
  return (
    <div className="flex gap-0.5 items-center" title="Completeness: ML name / Address / DOB">
      {dots.map((d, i) => (
        <div
          key={i}
          title={d.has ? d.title + ' \u2713' : d.title + ' missing'}
          className={'w-1.5 h-1.5 rounded-full ' + (d.has ? 'bg-green-400' : 'bg-gray-200')}
        />
      ))}
    </div>
  )
}

function Field({ label, value, ml }: { label: string; value: string; ml?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">{label}</p>
      <p
        className={'text-xs text-gray-800 mt-0.5 leading-snug ' + (ml ? 'font-malayalam' : '')}
        lang={ml ? 'ml' : undefined}
      >
        {value}
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

type Tab = 'unclaimed' | 'pending_claim' | 'approved' | 'all'

export default function UsersClient({
  profiles,
  registryMap,
  prayerGroups,
}: {
  profiles: ProfileRow[]
  registryMap: Record<string, RegistryLink>
  prayerGroups: { id: string; name: string; name_ml: string | null }[]
}) {
  const router = useRouter()
  const [tab, setTab]                     = useState<Tab>('unclaimed')
  const [expanded, setExpanded]           = useState<Set<string>>(new Set())
  const [saving, setSaving]               = useState<string | null>(null)
  const [pageError, setPageError]         = useState<string | null>(null)
  const [linkingProfile, setLinkingProfile] = useState<ProfileRow | null>(null)

  const counts: Record<Tab, number> = {
    unclaimed:     profiles.filter(p => p.claim_status === 'unclaimed').length,
    pending_claim: profiles.filter(p => p.claim_status === 'pending_claim').length,
    approved:      profiles.filter(p => p.claim_status === 'approved').length,
    all:           profiles.length,
  }
  const tabLabels: Record<Tab, string> = {
    unclaimed:     'Needs linking',
    pending_claim: 'Awaiting approval',
    approved:      'Linked',
    all:           'All',
  }

  const filtered = tab === 'all' ? profiles : profiles.filter(p => p.claim_status === tab)

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleApprove(profileId: string) {
    setSaving(profileId + ':approve'); setPageError(null)
    const r = await approveClaim(profileId)
    setSaving(null)
    if ('error' in r) { setPageError(r.error); return }
    router.refresh()
  }

  async function handleDeny(profileId: string) {
    setSaving(profileId + ':deny'); setPageError(null)
    const r = await denyClaim(profileId)
    setSaving(null)
    if ('error' in r) { setPageError(r.error); return }
    router.refresh()
  }

  async function handleDisable(profileId: string) {
    setSaving(profileId + ':disable'); setPageError(null)
    const r = await adminDisableUser(profileId)
    setSaving(null)
    if ('error' in r) { setPageError(r.error); return }
    router.refresh()
  }

  async function handleEnable(profileId: string) {
    setSaving(profileId + ':enable'); setPageError(null)
    const r = await adminEnableUser(profileId)
    setSaving(null)
    if ('error' in r) { setPageError(r.error); return }
    router.refresh()
  }

  const btn = 'text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[34px] transition-colors disabled:opacity-50'

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-amber-100 pb-3">
        {(Object.keys(tabLabels) as Tab[]).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ' +
              (tab === key ? 'bg-brand-900 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100')
            }
          >
            {tabLabels[key]}
            <span className={
              'ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ' +
              (tab === key ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900')
            }>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {pageError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {pageError}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">
          No accounts in this category.
        </p>
      )}

      <div className="space-y-2">
        {filtered.map(profile => {
          const isExpanded   = expanded.has(profile.id)
          const isSaving     = saving?.startsWith(profile.id) ?? false
          const registryLink = registryMap[profile.id]
          // POST-016: prefer display_name (backfilled by Stage A); fall back to full_name
          // while legacy profile columns still exist (Stage B not yet run).
          const displayName  = profile.display_name ?? profile.full_name
          const jsonbMembers = profile.family_members ?? []

          return (
            <div
              key={profile.id}
              className="rounded-xl border border-amber-100 bg-white shadow-sm overflow-hidden"
            >
              {/* ── Collapsed row ── */}
              <div
                onClick={() => toggleExpand(profile.id)}
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-amber-50/60 transition-colors select-none"
              >
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-brand-900">{displayName}</p>
                  {profile.full_name_ml && (
                    <p className="text-xs font-malayalam text-muted-foreground truncate" lang="ml">
                      {profile.full_name_ml}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <p className="hidden sm:block text-xs text-muted-foreground w-32 shrink-0 tabular-nums">
                  {profile.phone}
                </p>

                {/* Signed up */}
                <p className="hidden md:block text-xs text-muted-foreground w-20 shrink-0 text-right tabular-nums">
                  {timeAgo(profile.created_at)}
                </p>

                {/* Badges + completeness */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={profile.status} />
                  <ClaimBadge cs={profile.claim_status} />
                  <Dots profile={profile} />
                  {jsonbMembers.length > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                      {'\u{1F46A}'} {jsonbMembers.length}
                    </span>
                  )}
                </div>

                {/* Chevron */}
                <div className="text-muted-foreground shrink-0 ml-1">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* ── Expanded detail panel ── */}
              {isExpanded && (
                <div className="border-t border-amber-50 px-4 py-4 space-y-4 bg-gray-50/50">

                  {/* Profile field grid */}
                  {/* POST-016: after Stage B, full_name / address / date_of_birth are dropped
                      from profiles. Read them from family_members row at that point. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <Field label="Name (EN)" value={profile.full_name} />
                    {profile.full_name_ml && (
                      <Field label="Name (ML)" value={profile.full_name_ml} ml />
                    )}
                    <Field label="Phone" value={profile.phone} />
                    {profile.email && <Field label="Email" value={profile.email} />}
                    {profile.date_of_birth && (
                      <Field
                        label="Date of Birth"
                        value={new Date(profile.date_of_birth).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      />
                    )}
                    {profile.address && <Field label="Address" value={profile.address} />}
                    {profile.house_name && <Field label="House Name" value={profile.house_name} />}
                    <Field
                      label="Signed Up"
                      value={new Date(profile.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    />
                  </div>

                  {/* Registry link status */}
                  {registryLink && (
                    <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-0.5">
                        {profile.claim_status === 'pending_claim'
                          ? 'Self-claimed — awaiting admin approval'
                          : 'Linked to registry'}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-green-900 font-medium">
                          {registryLink.memberName} &middot; {registryLink.houseName}
                        </p>
                        <a
                          href={'/admin/registry/' + registryLink.familyId}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5"
                        >
                          View <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* User-entered family_members JSONB */}
                  {jsonbMembers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
                        Household data entered by user ({jsonbMembers.length} member{jsonbMembers.length !== 1 ? 's' : ''})
                      </p>
                      <div className="space-y-1.5">
                        {jsonbMembers.map((fm, i) => (
                          <div key={i} className="text-xs text-gray-700 flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">{fm.name}</span>
                            {fm.relation && (
                              <span className="text-muted-foreground capitalize">&middot; {fm.relation}</span>
                            )}
                            {fm.dob && (
                              <span className="text-muted-foreground">&middot; b.{fm.dob}</span>
                            )}
                            {fm.name_ml && (
                              <span className="font-malayalam text-muted-foreground" lang="ml">
                                &middot; {fm.name_ml}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-100">
                    {profile.claim_status === 'unclaimed' && profile.status !== 'disabled' && (
                      <button
                        onClick={e => { e.stopPropagation(); setLinkingProfile(profile) }}
                        className={btn + ' bg-brand-900 text-white hover:bg-brand-800'}
                      >
                        Link to registry
                      </button>
                    )}

                    {profile.claim_status === 'pending_claim' && (
                      <>
                        <button
                          disabled={isSaving}
                          onClick={() => handleApprove(profile.id)}
                          className={btn + ' bg-green-600 text-white hover:bg-green-700'}
                        >
                          {saving === profile.id + ':approve' ? 'Approving\u2026' : '\u2713 Approve Claim'}
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={() => handleDeny(profile.id)}
                          className={btn + ' bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}
                        >
                          {saving === profile.id + ':deny' ? 'Denying\u2026' : '\u2715 Deny Claim'}
                        </button>
                      </>
                    )}

                    {profile.status !== 'disabled' ? (
                      <button
                        disabled={isSaving}
                        onClick={() => handleDisable(profile.id)}
                        className={btn + ' bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'}
                      >
                        {saving === profile.id + ':disable' ? 'Disabling\u2026' : 'Disable'}
                      </button>
                    ) : (
                      <button
                        disabled={isSaving}
                        onClick={() => handleEnable(profile.id)}
                        className={btn + ' bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}
                      >
                        {saving === profile.id + ':enable' ? 'Enabling\u2026' : '\u21A9 Re-enable'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Link modal — rendered outside the list to avoid z-index issues */}
      {linkingProfile && (
        <LinkModal
          profile={linkingProfile}
          prayerGroups={prayerGroups}
          onClose={() => { setLinkingProfile(null); router.refresh() }}
        />
      )}
    </div>
  )
}
