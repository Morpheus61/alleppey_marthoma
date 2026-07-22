'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: roleRow } = await supabase
    .from('parish_roles')
    .select('id')
    .eq('profile_id', user.id)
    .eq('role', 'super_admin')
    .is('revoked_at', null)
    .maybeSingle()

  if (!roleRow) redirect('/pulpit')
  return { supabase, userId: user.id }
}

export async function createMessage(
  formData: FormData,
): Promise<{ error: string } | void> {
  const { supabase, userId } = await requireAdmin()

  const body = (formData.get('body') as string | null)?.trim() ?? ''
  if (!body) return { error: 'Message body is required.' }

  const isDraft = formData.get('action') === 'draft'

  const { error } = await supabase.from('pulpit_messages').insert({
    title:             (formData.get('title') as string | null)?.trim() || null,
    body,
    body_ml:           (formData.get('body_ml') as string | null)?.trim() || null,
    scripture_ref:     (formData.get('scripture_ref') as string | null)?.trim() || null,
    scripture_text:    (formData.get('scripture_text') as string | null)?.trim() || null,
    scripture_text_ml: (formData.get('scripture_text_ml') as string | null)?.trim() || null,
    is_pinned:         formData.get('is_pinned') === 'true',
    is_published:      !isDraft,
    author_id:         userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/pulpit')
  revalidatePath('/')

  redirect(isDraft ? '/pulpit?tab=drafts' : '/pulpit')
}

export async function publishDraft(id: string): Promise<{ error: string } | void> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('pulpit_messages')
    .update({ is_published: true })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pulpit')
  revalidatePath('/')
}

export async function unpublishMessage(id: string): Promise<{ error: string } | void> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('pulpit_messages')
    .update({ is_published: false })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pulpit')
  revalidatePath('/')
}
