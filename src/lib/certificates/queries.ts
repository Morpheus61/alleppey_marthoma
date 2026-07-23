import { createClient } from '@/lib/supabase/client'
import type { MemberRecord, CertificateRequest, CertType } from './types'

/**
 * Returns the full name of the current Vicar (super_admin parish role).
 * Used to pre-populate the Vicar field on all certificate types.
 */
export async function getVicarName(): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('parish_roles')
    .select('profiles!profile_id(full_name)')
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .maybeSingle()
  return (data as unknown as { profiles: { full_name: string } | null } | null)
    ?.profiles?.full_name ?? ''
}

/**
 * Search the parish registry for certificate candidates.
 * Matches on member name (English or Malayalam) OR family/house name.
 * Only living registry members are returned — no app account required.
 */
export async function searchMembers(query: string): Promise<MemberRecord[]> {
  if (!query.trim()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('search_registry_for_certs', { p_query: query.trim() })
  if (error) throw error
  return (data ?? []) as unknown as MemberRecord[]
}

/**
 * Fetch a single registry member by family_member_id.
 * Used by the approval queue and certificate detail page.
 */
export async function getMemberById(id: string): Promise<MemberRecord | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .rpc('get_registry_member_for_cert', { p_id: id })
  if (error) return null
  const row = (data as unknown[])?.[0]
  return row ? (row as MemberRecord) : null
}

/** Generate the next certificate number for a given type */
export async function getNextCertNo(certType: CertType): Promise<string> {
  const supabase = createClient()
  const year = new Date().getFullYear()
  const prefix: Record<CertType, string> = {
    baptism: 'BAP', communion: 'COM', confirmation: 'CON',
    matrimony: 'MAT', membership: 'MEM', transfer: 'TRF',
  }
  const { count } = await supabase
    .from('certificate_requests')
    .select('*', { count: 'exact', head: true })
    .eq('cert_type', certType)
  return `SGMC-${prefix[certType]}-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
}

/** Submit a new certificate request linked to the parish registry. */
export async function createCertificateRequest(payload: {
  cert_type: CertType
  cert_no: string
  /** family_members.id — the authoritative registry link */
  family_member_id: string
  /** profiles.id — set only when the registry person has a linked app account */
  member_id?: string | null
  extras: Record<string, string>
  created_by: string
  secretary_signature_url?: string
  secretary_signature_type?: 'drawn' | 'uploaded'
}): Promise<CertificateRequest> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as unknown as CertificateRequest
}

// ── Internal helper: flatten a nested family_members join row into MemberRecord ──
function flattenRegistryMember(rm: unknown): MemberRecord | undefined {
  if (!rm) return undefined
  const r = rm as {
    id: string
    full_name: string
    full_name_ml: string | null
    date_of_birth: string | null
    relation_to_head: string | null
    phone: string | null
    profile_id: string | null
    family_units: {
      house_name: string
      house_name_ml: string | null
      address: string | null
      family_register_no: string | null
      groups: { name: string } | null
    } | null
  }
  return {
    id:                       r.id,
    family_id:                r.family_units ? (rm as { family_units: { id?: string } }).family_units?.id ?? null : null,
    full_name:                r.full_name,
    full_name_ml:             r.full_name_ml,
    date_of_birth:            r.date_of_birth,
    relation_to_head:         r.relation_to_head,
    phone:                    r.phone,
    house_name:               r.family_units?.house_name ?? null,
    house_name_ml:            r.family_units?.house_name_ml ?? null,
    address:                  r.family_units?.address ?? null,
    family_register_no:       r.family_units?.family_register_no ?? null,
    ward:                     r.family_units?.groups?.name ?? null,
    profile_id:               r.profile_id,
    // Life events are in extras (filled by secretary at cert creation time)
    baptism_date:             null,
    baptism_register_no:      null,
    confirmation_date:        null,
    confirmation_register_no: null,
    father_name:              null,
    mother_name:              null,
    godfather:                null,
    godmother:                null,
    family_members:           null,
  }
}

/** All pending requests with joined member + creator data */
export async function getPendingRequests(): Promise<CertificateRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      registry_member:family_members!family_member_id(
        id, full_name, full_name_ml, date_of_birth, relation_to_head, phone, profile_id,
        family_units!family_id(
          house_name, house_name_ml, address, family_register_no,
          groups!prayer_group_id(name)
        )
      ),
      creator:profiles!created_by(id, full_name, phone)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>
    return {
      ...r,
      member: flattenRegistryMember(r.registry_member),
    } as unknown as CertificateRequest
  })
}

/** All requests — for the certificate log */
export async function getAllRequests(): Promise<CertificateRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      registry_member:family_members!family_member_id(
        id, full_name, full_name_ml, phone, profile_id,
        family_units!family_id(house_name)
      ),
      creator:profiles!created_by(id, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>
    return { ...r, member: flattenRegistryMember(r.registry_member) } as unknown as CertificateRequest
  })
}

/** Fetch a single certificate request by ID */
export async function getCertificateRequest(id: string): Promise<CertificateRequest | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      registry_member:family_members!family_member_id(
        id, full_name, full_name_ml, date_of_birth, relation_to_head, phone, profile_id,
        family_units!family_id(
          house_name, house_name_ml, address, family_register_no,
          groups!prayer_group_id(name)
        )
      ),
      creator:profiles!created_by(id, full_name, phone),
      reviewer:profiles!reviewed_by(id, full_name)
    `)
    .eq('id', id)
    .single()
  if (error) return null
  const r = data as unknown as Record<string, unknown>
  return {
    ...r,
    member: flattenRegistryMember(r.registry_member),
  } as unknown as CertificateRequest
}

/** Vicar approves a request */
export async function approveRequest(
  id: string,
  reviewerId: string,
  vicarSignatureUrl?: string,
  vicarSignatureType?: 'drawn' | 'uploaded',
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('certificate_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      vicar_signature_url: vicarSignatureUrl ?? null,
      vicar_signature_type: vicarSignatureType ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

/** Vicar rejects a request */
export async function rejectRequest(
  id: string,
  reviewerId: string,
  reason: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('certificate_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
  if (error) throw error
}

/** Admin: delete a certificate request by ID */
export async function deleteCertificateRequest(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('certificate_requests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Upload a signature image to the 'signatures' storage bucket */
export async function uploadSignature(dataUrl: string, fileName: string): Promise<string> {
  const supabase = createClient()
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const { error } = await supabase.storage
    .from('signatures')
    .upload(fileName, blob, { contentType: 'image/png', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('signatures').getPublicUrl(fileName)
  return data.publicUrl
}
