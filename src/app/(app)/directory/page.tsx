import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Pencil, MessageCircle, UserCheck } from 'lucide-react'
import type { Profile } from '@/types/database'
import ImportPanel from './ImportPanel'
import AddMemberForm from '@/components/directory/AddMemberForm'
import { disableMember, reactivateMember } from './actions'
import DisableMemberButton from '@/components/directory/DisableMemberButton'

export const metadata = { title: 'Church Directory' }

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DirectoryPage({ searchParams }: Props) {
  const { q: qRaw } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin, status').eq('id', user.id).single()
  const myProfile = me as Pick<Profile, 'is_admin' | 'status'> | null
  if (!myProfile || myProfile.status !== 'active') redirect('/')

  const q = qRaw?.trim() ?? ''

  let query = supabase
    .from('profiles')
    .select('id, full_name, full_name_ml, phone, house_name, avatar_url, family_photo_url, is_admin, whatsapp_number, is_mobile_whatsapp, date_of_birth, address, email, status')
    .in('status', myProfile.is_admin ? ['active', 'disabled'] : ['active'])
    .order('full_name')

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,full_name_ml.ilike.%${q}%,house_name.ilike.%${q}%,address.ilike.%${q}%`)
  }

  const { data } = await query.limit(300)
  const members = (data as Partial<Profile>[] | null) ?? []
  const activeMembers   = members.filter(m => m.status === 'active')
  const disabledMembers = myProfile.is_admin ? members.filter(m => m.status === 'disabled') : []

  const grouped = activeMembers.reduce<Record<string, typeof activeMembers>>((acc, m) => {
    const letter = (m.full_name ?? '#')[0]?.toUpperCase() ?? '#'
    ;(acc[letter] ??= []).push(m)
    return acc
  }, {})

  const waNumber = (m: Partial<Profile>) =>
    m.is_mobile_whatsapp ? m.phone : (m.whatsapp_number ?? null)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

      <div>
        <h1 className="text-2xl font-bold text-brand-900">Church Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{activeMembers.length} active members{disabledMembers.length > 0 ? ` · ${disabledMembers.length} disabled` : ''}</p>
      </div>

      {myProfile.is_admin && (
        <div className="grid sm:grid-cols-2 gap-4">
          <AddMemberForm />
          <ImportPanel />
        </div>
      )}

      {/* Search */}
      <form method="GET">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q}
            placeholder="Search by name, family or address…"
            className="w-full rounded-xl border border-amber-100 bg-white pl-9 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-900" />
        </div>
      </form>

      {/* Member list grouped alphabetically */}
      {Object.keys(grouped).sort().map(letter => (
        <section key={letter}>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2 px-1">{letter}</p>
          <div className="space-y-2">
            {grouped[letter].map(m => {
              const wa = waNumber(m)
              return (
                <div key={m.id} className="bg-white rounded-xl border border-amber-50 shadow-sm overflow-hidden">
                  {/* Family photo — full-width banner if available */}
                  {m.family_photo_url && (
                    <div className="relative w-full h-32 bg-brand-50">
                      <Image
                        src={m.family_photo_url}
                        alt={`${m.full_name} family`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Profile pic (avatar) — small circle */}
                    <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-brand-100 border-2 border-white shadow-sm flex items-center justify-center">
                      {m.avatar_url ? (
                        <Image src={m.avatar_url} alt={m.full_name ?? ''} width={44} height={44} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        <span className="text-brand-900 font-bold text-base">{(m.full_name ?? '?')[0].toUpperCase()}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {m.full_name}
                        {m.is_admin && <span className="ml-2 text-[10px] bg-brand-900 text-white px-1.5 py-0.5 rounded-full font-bold">Admin</span>}
                      </p>
                      {m.full_name_ml && <p className="text-xs text-muted-foreground font-malayalam truncate" lang="ml">{m.full_name_ml}</p>}
                      {m.house_name && <p className="text-xs text-muted-foreground truncate">{m.house_name}</p>}
                      {myProfile.is_admin && m.address && <p className="text-[11px] text-muted-foreground truncate">{m.address}</p>}
                    </div>

                    {/* Admin actions */}
                    {myProfile.is_admin && (
                      <div className="flex items-center gap-2 shrink-0">
                        {wa && (
                          <a href={`https://wa.me/91${wa}`} target="_blank" rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700" title={`WhatsApp ${wa}`}>
                            <MessageCircle size={18} />
                          </a>
                        )}
                        <Link href={`/directory/${m.id}`} className="text-amber-600 hover:text-amber-800" title="Edit member">
                          <Pencil size={16} />
                        </Link>
                        <DisableMemberButton memberId={m.id!} memberName={m.full_name ?? 'this member'} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {activeMembers.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">
          {q ? `No members found for "${q}"` : 'No members in the directory yet.'}
        </p>
      )}

      {/* ── Disabled members (admin only) ── */}
      {myProfile.is_admin && disabledMembers.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs font-semibold text-red-500 cursor-pointer select-none py-1">
            {disabledMembers.length} disabled member{disabledMembers.length > 1 ? 's' : ''}
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
                    <button type="submit" className="text-green-600 hover:text-green-800" title="Re-activate member">
                      <UserCheck size={16} />
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
