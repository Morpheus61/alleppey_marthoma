export type CertType =
  | 'baptism'
  | 'communion'
  | 'confirmation'
  | 'matrimony'
  | 'membership'
  | 'transfer'

export interface FamilyMember {
  name?: string
  relation?: string   // Title Case: "Father", "Mother", "Spouse", "Son", "Daughter" …
  dob?: string
  phone?: string
}

export interface MemberRecord {
  id: string
  full_name: string
  full_name_ml: string | null
  phone: string
  house_name: string | null
  address: string | null
  date_of_birth: string | null
  ward: string | null
  family_register_no: string | null
  baptism_date: string | null
  baptism_register_no: string | null
  confirmation_date: string | null
  confirmation_register_no: string | null
  father_name: string | null
  mother_name: string | null
  godfather: string | null
  godmother: string | null
  family_members: FamilyMember[] | null  // JSONB column — relation strings are Title Case
  display_name: string | null
  avatar_url: string | null
  is_admin: boolean
  claim_status: string | null
}

export interface CertificateRequest {
  id: string
  cert_type: CertType
  cert_no: string | null
  member_id: string
  extras: Record<string, string>
  status: 'pending' | 'approved' | 'rejected'
  created_by: string
  created_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  secretary_signature_url: string | null
  vicar_signature_url: string | null
  secretary_signature_type: 'drawn' | 'uploaded' | null
  vicar_signature_type: 'drawn' | 'uploaded' | null
  member?: MemberRecord
  creator?: Pick<MemberRecord, 'id' | 'full_name' | 'phone'>
  reviewer?: Pick<MemberRecord, 'id' | 'full_name'>
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retrieve a family member by relation (case-insensitive) from JSONB array */
export function getFamilyMember(
  familyMembers: FamilyMember[] | null | undefined,
  relation: string,
): string {
  if (!familyMembers?.length) return ''
  const found = familyMembers.find(
    f => f.relation?.toLowerCase() === relation.toLowerCase(),
  )
  return found?.name ?? ''
}

/** Resolve father name: dedicated column first, JSONB fallback */
export function resolveFather(m: MemberRecord): string {
  return m.father_name || getFamilyMember(m.family_members, 'Father') || '—'
}

/** Resolve mother name */
export function resolveMother(m: MemberRecord): string {
  return m.mother_name || getFamilyMember(m.family_members, 'Mother') || '—'
}

/** Resolve godfather */
export function resolveGodfather(m: MemberRecord): string {
  return m.godfather || getFamilyMember(m.family_members, 'Godfather') || '—'
}

/** Resolve godmother */
export function resolveGodmother(m: MemberRecord): string {
  return m.godmother || getFamilyMember(m.family_members, 'Godmother') || '—'
}
