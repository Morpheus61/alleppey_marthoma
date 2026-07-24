'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as XLSX from 'xlsx'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/')
  return supabase
}

export interface ImportRow {
  full_name: string
  full_name_ml?: string | null
  phone: string
  house_name?: string | null
  bhagam_name?: string | null
  status?: 'active' | 'pending'
}

export async function importDirectory(formData: FormData) {
  const supabase = await requireAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file uploaded' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

  if (!rows.length) return { error: 'File is empty or unreadable' }

  const records: ImportRow[] = rows.map(row => {
    // Accept common column name variants (case-insensitive)
    const get = (keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/\s+/g, '_') === k)
        if (found && row[found]) return String(row[found]).trim()
      }
      return null
    }

    const phone = get(['phone', 'mobile', 'mobile_number', 'phone_number'])
      ?.replace(/\D/g, '') ?? ''
    // Normalise Indian number to 10-digit
    const phone10 = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone

    return {
      full_name:    get(['full_name', 'name', 'member_name']) ?? '',
      full_name_ml: get(['full_name_ml', 'name_ml', 'malayalam_name']),
      phone:        phone10,
      house_name:   get(['house_name', 'house', 'family_name', 'house/family']),
      bhagam_name:  get(['bhagam', 'bhagam_name', 'prayer_group', 'ward']),
      status:       'active' as const,
    }
  }).filter(r => r.full_name && r.phone.length === 10)

  if (!records.length) return { error: 'No valid rows found. Ensure columns: Name, Phone (10-digit), House Name' }

  // Upsert — match on phone; update name/house if already exists
  const { error } = await supabase.from('profiles').upsert(
    records.map(r => ({
      // Supabase requires `id` for upsert on auth.users-linked table.
      // For new members without Supabase auth accounts we use a generated UUID placeholder.
      // They will link on first OTP login via the auth trigger.
      full_name:    r.full_name,
      full_name_ml: r.full_name_ml ?? null,
      phone:        r.phone,
      house_name:   r.house_name ?? null,
      status:       r.status ?? 'active',
      is_admin:     false,
    })),
    { onConflict: 'phone', ignoreDuplicates: false }
  )

  if (error) return { error: error.message }

  // Best-effort: assign bhagam to existing family_units matched by house_name.
  // This runs after the profile upsert and does not fail the import if it errors.
  const bhagamRows = records.filter(r => r.bhagam_name && r.house_name)
  if (bhagamRows.length > 0) {
    // Fetch all prayer groups once
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, name_ml')
      .eq('group_type', 'prayer')
      .eq('is_archived', false)

    if (groups && groups.length > 0) {
      // Collect unique house_name → bhagam_name pairs
      const houseMap = new Map<string, string>()
      for (const r of bhagamRows) {
        if (r.house_name && r.bhagam_name && !houseMap.has(r.house_name)) {
          houseMap.set(r.house_name, r.bhagam_name)
        }
      }

      for (const [houseName, bhagamName] of houseMap.entries()) {
        const normBhagam = bhagamName.toLowerCase().trim()
        const matchedGroup = groups.find(
          g => g.name.toLowerCase().trim() === normBhagam ||
               (g.name_ml ?? '').trim() === bhagamName.trim()
        )
        if (!matchedGroup) continue

        // Update any family_unit with this house_name that has no prayer_group_id yet
        await supabase
          .from('family_units')
          .update({ prayer_group_id: matchedGroup.id })
          .ilike('house_name', houseName)
          .is('prayer_group_id', null)
      }
    }
  }

  revalidatePath('/directory')
  revalidatePath('/admin')
  return { imported: records.length }
}

/* ── Add Single Member ────────────────────────── */

export async function addMember(formData: FormData) {
  const supabase = await requireAdmin()

  const full_name    = (formData.get('full_name')    as string).trim()
  const full_name_ml = (formData.get('full_name_ml') as string | null)?.trim() || null
  const phone_raw    = (formData.get('phone')        as string).replace(/\D/g, '')
  const phone        = phone_raw.startsWith('91') && phone_raw.length === 12
    ? phone_raw.slice(2) : phone_raw
  const house_name   = (formData.get('house_name')   as string | null)?.trim() || null
  const status       = (formData.get('status')       as 'active' | 'pending') || 'active'

  if (!full_name)          return { error: 'Full name is required.' }
  if (phone.length !== 10) return { error: 'Enter a valid 10-digit mobile number.' }

  const { error } = await supabase.from('profiles').upsert(
    { full_name, full_name_ml, phone, house_name, status, is_admin: false },
    { onConflict: 'phone', ignoreDuplicates: false },
  )

  if (error) return { error: error.message }

  revalidatePath('/directory')
  revalidatePath('/admin')
  return { success: true }
}

/* ── Disable Member (soft-delete) ─────────────── */

export async function disableMember(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('profiles').update({ status: 'disabled' }).eq('id', id)
  revalidatePath('/directory')
  revalidatePath('/admin')
}

/* ── Re-activate Member ───────────────────────── */

export async function reactivateMember(id: string) {
  const supabase = await requireAdmin()
  await supabase.from('profiles').update({ status: 'active' }).eq('id', id)
  revalidatePath('/directory')
  revalidatePath('/admin')
}

