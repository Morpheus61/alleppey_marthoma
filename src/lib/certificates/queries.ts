import { createClient } from '@/lib/supabase/client'
import type { MemberRecord, CertificateRequest, CertType } from './types'

const MEMBER_SELECT = `
  id, full_name, full_name_ml, phone, house_name, address,
  date_of_birth, ward, family_register_no,
  baptism_date, baptism_register_no,
  confirmation_date, confirmation_register_no,
  father_name, mother_name, godfather, godmother,
  family_members, display_name, avatar_url, is_admin, claim_status
`.trim()

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

/** Live search of active members — does NOT filter by claim_status */
export async function searchMembers(query: string): Promise<MemberRecord[]> {
  if (!query.trim()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(MEMBER_SELECT)
    .ilike('full_name', `%${query}%`)
    .eq('status', 'active')
    .order('full_name')
    .limit(10)
  if (error) throw error
  return (data ?? []) as unknown as MemberRecord[]
}

/** Fetch a single member by ID */
export async function getMemberById(id: string): Promise<MemberRecord | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(MEMBER_SELECT)
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as MemberRecord
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

/** Submit a new certificate request */
export async function createCertificateRequest(payload: {
  cert_type: CertType
  cert_no: string
  member_id: string
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

/** All pending requests with joined member + creator data */
export async function getPendingRequests(): Promise<CertificateRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      member:profiles!member_id(
        id, full_name, full_name_ml, phone, house_name, ward, address,
        date_of_birth, father_name, mother_name,
        baptism_date, baptism_register_no,
        confirmation_date, confirmation_register_no,
        family_register_no, godfather, godmother, family_members
      ),
      creator:profiles!created_by(id, full_name, phone)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CertificateRequest[]
}

/** All requests — for the certificate log */
export async function getAllRequests(): Promise<CertificateRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      member:profiles!member_id(id, full_name, full_name_ml, phone, house_name),
      creator:profiles!created_by(id, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as unknown as CertificateRequest[]
}

/** Fetch a single certificate request by ID */
export async function getCertificateRequest(id: string): Promise<CertificateRequest | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certificate_requests')
    .select(`
      *,
      member:profiles!member_id(
        id, full_name, full_name_ml, phone, house_name, ward, address,
        date_of_birth, father_name, mother_name,
        baptism_date, baptism_register_no,
        confirmation_date, confirmation_register_no,
        family_register_no, godfather, godmother, family_members
      ),
      creator:profiles!created_by(id, full_name, phone),
      reviewer:profiles!reviewed_by(id, full_name)
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as CertificateRequest
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
