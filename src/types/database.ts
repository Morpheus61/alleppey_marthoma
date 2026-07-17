// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id nsuxmlbrehmqdwogkjwr > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface FamilyMember {
  name: string
  name_ml?: string | null
  dob?: string | null        // ISO date "YYYY-MM-DD"
  relation?: string | null   // "Spouse" | "Son" | "Daughter" | "Father" | "Mother" | other
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          full_name_ml: string | null
          phone: string
          house_name: string | null
          avatar_url: string | null
          family_photo_url: string | null
          ui_language: 'en' | 'ml'
          is_admin: boolean
          status: 'pending' | 'active' | 'disabled'
          created_at: string
          date_of_birth: string | null
          address: string | null
          phone_landline: string | null
          whatsapp_number: string | null
          is_mobile_whatsapp: boolean
          email: string | null
          family_members: FamilyMember[]
          // Wave 2: registry attachment
          family_member_id: string | null
          display_name: string | null
          claim_status: 'unclaimed' | 'pending_claim' | 'approved'
        }
        Insert: {
          id: string
          full_name: string
          full_name_ml?: string | null
          phone: string
          house_name?: string | null
          avatar_url?: string | null
          ui_language?: 'en' | 'ml'
          is_admin?: boolean
          status?: 'pending' | 'active' | 'disabled'
          created_at?: string
          date_of_birth?: string | null
          address?: string | null
          phone_landline?: string | null
          whatsapp_number?: string | null
          is_mobile_whatsapp?: boolean
          email?: string | null
          family_members?: FamilyMember[]
          family_photo_url?: string | null
          family_member_id?: string | null
          display_name?: string | null
          claim_status?: 'unclaimed' | 'pending_claim' | 'approved'
        }
        Update: {
          id?: string
          full_name?: string
          full_name_ml?: string | null
          phone?: string
          house_name?: string | null
          avatar_url?: string | null
          family_photo_url?: string | null
          family_member_id?: string | null
          display_name?: string | null
          claim_status?: 'unclaimed' | 'pending_claim' | 'approved'
          ui_language?: 'en' | 'ml'
          is_admin?: boolean
          status?: 'pending' | 'active' | 'disabled'
          created_at?: string
          date_of_birth?: string | null
          address?: string | null
          phone_landline?: string | null
          whatsapp_number?: string | null
          is_mobile_whatsapp?: boolean
          email?: string | null
          family_members?: FamilyMember[]
        }
      }
      groups: {
        Row: {
          id: string
          slug: string
          name: string
          name_ml: string | null
          description: string | null
          description_ml: string | null
          cover_image_url: string | null
          group_type: 'functional' | 'prayer' | 'youth'
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          name_ml?: string | null
          description?: string | null
          description_ml?: string | null
          cover_image_url?: string | null
          group_type?: 'functional' | 'prayer' | 'youth'
          is_archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          name_ml?: string | null
          description?: string | null
          description_ml?: string | null
          cover_image_url?: string | null
          group_type?: 'functional' | 'prayer' | 'youth'
          is_archived?: boolean
          created_at?: string
        }
      }
      group_memberships: {
        Row: {
          group_id: string
          user_id: string
          role: 'member' | 'leader'
          status: 'requested' | 'active' | 'removed'
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'member' | 'leader'
          status?: 'requested' | 'active' | 'removed'
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: 'member' | 'leader'
          status?: 'requested' | 'active' | 'removed'
          joined_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          group_id: string | null
          author_id: string
          title: string | null
          body: string
          visibility: 'members' | 'public'
          image_urls: string[]
          is_pinned: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id?: string | null
          author_id: string
          title?: string | null
          body: string
          visibility?: 'members' | 'public'
          image_urls?: string[]
          is_pinned?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string | null
          author_id?: string
          title?: string | null
          body?: string
          visibility?: 'members' | 'public'
          image_urls?: string[]
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          body?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          group_id: string | null
          created_by: string
          title: string
          title_ml: string | null
          description: string | null
          venue: string | null
          starts_at: string
          ends_at: string | null
          visibility: 'members' | 'public'
          rrule: string | null
          reminder_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id?: string | null
          created_by: string
          title: string
          title_ml?: string | null
          description?: string | null
          venue?: string | null
          starts_at: string
          ends_at?: string | null
          visibility?: 'members' | 'public'
          rrule?: string | null
          reminder_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string | null
          created_by?: string
          title?: string
          title_ml?: string | null
          description?: string | null
          venue?: string | null
          starts_at?: string
          ends_at?: string | null
          visibility?: 'members' | 'public'
          rrule?: string | null
          reminder_minutes?: number | null
          created_at?: string
        }
      }
      event_rsvps: {
        Row: {
          event_id: string
          user_id: string
          response: 'yes' | 'no' | 'maybe'
          responded_at: string
        }
        Insert: {
          event_id: string
          user_id: string
          response: 'yes' | 'no' | 'maybe'
          responded_at?: string
        }
        Update: {
          event_id?: string
          user_id?: string
          response?: 'yes' | 'no' | 'maybe'
          responded_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          subscription: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription?: Json
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_group_member: {
        Args: { group_id: string }
        Returns: boolean
      }
      is_group_leader: {
        Args: { group_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}

// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMembership = Database['public']['Tables']['group_memberships']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventRsvp = Database['public']['Tables']['event_rsvps']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']

// ── Wave 2: Parish Role System ────────────────────────────────────────────────

export type ParishRoleKind = 'deacon' | 'treasurer' | 'admin' | 'super_admin'

export interface ParishRole {
  id:          string
  profile_id:  string
  role:        ParishRoleKind
  assigned_by: string
  assigned_at: string
  revoked_by:  string | null
  revoked_at:  string | null
}

export interface ChangeRequest {
  id:             string
  target_table:   string
  target_id:      string | null
  change_type:    'insert' | 'update' | 'delete' | 'reversal'
  current_data:   Json | null
  proposed_data:  Json
  requested_by:   string
  status:         'pending' | 'approved' | 'rejected'
  reviewed_by:    string | null
  reviewed_at:    string | null
  review_remarks: string | null
  created_at:     string
}

export interface AuditLog {
  id:           string
  actor_id:     string | null
  action:       string
  target_table: string | null
  target_id:    string | null
  details:      Json | null
  created_at:   string
}

// ── Wave 2: Parish Registry ───────────────────────────────────────────────────

export interface FamilyUnit {
  id:              string
  house_name:      string
  house_name_ml:   string | null
  address:         string | null
  prayer_group_id: string
  created_at:      string
  updated_at:      string
}

export interface FamilyMemberRow {  // renamed from FamilyMember to avoid clash with existing interface
  id:               string
  family_id:        string
  profile_id:       string | null
  full_name:        string
  full_name_ml:     string | null
  relation_to_head: string | null
  date_of_birth:    string | null
  gender:           'male' | 'female' | 'other' | null
  is_deceased:      boolean
  notes:            string | null
  created_at:       string
  updated_at:       string
}

export interface LifeEvent {
  id:                 string
  family_member_id:   string
  event_type:         'baptism' | 'confirmation' | 'marriage' | 'death' | 'other'
  event_date:         string
  place:              string | null
  officiant:          string | null
  register_number:    string | null
  certificate_number: string | null
  remarks:            string | null
  recorded_by:        string
  superseded_by:      string | null
  created_at:         string
}

export interface AppSetting {
  key:         string
  value:       string
  description: string | null
  updated_by:  string | null
  updated_at:  string
}

// ── Wave 2: Finance ───────────────────────────────────────────────────────────

export interface Fund {
  id:                  string
  name:                string
  name_ml:             string | null
  description:         string | null
  bank_account_label:  string | null
  is_active:           boolean
  created_by:          string
  created_at:          string
}

export interface ContributionType {
  id:                string
  fund_id:           string
  name:              string
  name_ml:           string | null
  kind:              'subscription' | 'service_offertory' | 'appeal'
  amount_mode:       'fixed' | 'suggested' | 'open'
  amount:            number | null
  period_start:      string | null
  period_end:        string | null
  service_event_id:  string | null
  target_amount:     number | null
  target_visibility: 'parish' | 'office'
  is_active:         boolean
  created_by:        string
  created_at:        string
}

export interface ContributionEntry {
  id:                   string
  contribution_type_id: string
  family_id:            string
  member_id:            string | null
  amount:               number
  channel:              'upi_declared' | 'cash' | 'neft_declared'
  period_month:         string | null
  utr:                  string | null
  screenshot_path:      string | null
  status:               'submitted' | 'verified' | 'rejected' | 'reversed'
  receipt_number:       string | null
  recorded_by:          string
  verified_by:          string | null
  verified_at:          string | null
  reject_reason:        string | null
  reversal_of:          string | null
  created_at:           string
}
