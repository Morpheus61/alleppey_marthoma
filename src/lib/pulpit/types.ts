export interface PulpitMessage {
  id: string
  title: string | null
  body: string
  body_ml: string | null
  scripture_ref: string | null
  scripture_text: string | null
  scripture_text_ml: string | null
  is_published: boolean
  is_pinned: boolean
  author_id: string | null
  created_at: string
  updated_at: string
  // Joined fields (from queries)
  author?: { full_name: string; avatar_url: string | null } | null
  amen_count?: number
  user_has_amened?: boolean
}
