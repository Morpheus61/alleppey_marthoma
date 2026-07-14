// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id nsuxmlbrehmqdwogkjwr > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          ui_language: 'en' | 'ml'
          is_admin: boolean
          status: 'pending' | 'active' | 'disabled'
          created_at: string
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
        }
        Update: {
          id?: string
          full_name?: string
          full_name_ml?: string | null
          phone?: string
          house_name?: string | null
          avatar_url?: string | null
          ui_language?: 'en' | 'ml'
          is_admin?: boolean
          status?: 'pending' | 'active' | 'disabled'
          created_at?: string
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
