import { createClient } from '@/lib/supabase/client'

/** Toggle the current user's Amen on a message. Throws on error. */
export async function toggleAmen(messageId: string, currentlyAmened: boolean): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (currentlyAmened) {
    const { error } = await supabase
      .from('pulpit_amens')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('pulpit_amens')
      .insert({ message_id: messageId, user_id: user.id })
    if (error) throw error
  }
}
