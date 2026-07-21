export interface ProfileRow {
  id: string
  // POST-016: prefer display_name after Stage B; full_name is the pre-016 legacy column
  display_name: string | null
  full_name: string
  full_name_ml: string | null
  phone: string
  created_at: string
  status: 'pending' | 'active' | 'disabled'
  claim_status: 'unclaimed' | 'pending_claim' | 'approved'
  family_member_id: string | null
  date_of_birth: string | null
  address: string | null
  house_name: string | null
  email: string | null
  family_members: { name: string; name_ml?: string | null; dob?: string | null; relation?: string | null }[]
}

export interface RegistryLink {
  memberName: string
  houseName: string
  familyId: string
}
