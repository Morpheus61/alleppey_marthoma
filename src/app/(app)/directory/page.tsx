import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Pencil, MessageCircle } from 'lucide-react'
import type { Profile } from '@/types/database'
import ImportPanel from './ImportPanel'

export const metadata = { title: 'Church Directory' }

interface Props {
  searchParams: { q?: string }
}

export default async function DirectoryPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('is_admin, status').eq('id', user.id).single()
  const myProfile = me as Pick<Profile, 'is_admin' | 'status'> | null
  if (!myProfile || myProfile.status !== 'active') redirect('/')

  const q = searchParams.q?.trim() ?? ''

  let query = supabase
    .from('profiles')
    .select('id, full_name, full_name_ml, phone, house_name, avatar_url, is_admin, whatsapp_number, is_mobile_whatsapp, date_of_birth, address, email')
    .eq('status', 'active')
    .order('full_name')

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,full_name_ml.ilike.%${q}%,house_name.ilike.%${q}%,address.ilike.%${q}%`)
  }

  const { data } = await query.limit(300)
  const members = (data as Partial<Profile>[] | null) ?? []

  const grouped = members.reduce<Record<string, typeof members>>((acc, m) => {
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
        <p className="text-sm text-muted-foreground mt-0.5">{members.length} active members</p>
      </div>

      {myProfile.is_admin && <ImportPanel />}

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
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl border border-amber-50 px-4 py-3 shadow-sm">
                  {/* Avatar */}
                  <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt={m.full_name ?? ''} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-brand-900 font-bold text-lg">{(m.full_name ?? '?')[0].toUpperCase()}</span>
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {members.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">
          {q ? `No members found for "${q}"` : 'No members in the directory yet.'}
        </p>
      )}
    </div>
  )
}
