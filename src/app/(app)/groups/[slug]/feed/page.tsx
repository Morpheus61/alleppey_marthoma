// Stage 3 — Feed page (gated by group membership)
// Full implementation in Stage 6 (member feed with realtime)
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

interface Props { params: Promise<{ slug: string }> }

export default async function GroupFeedPage({ params }: Props) {
  const { slug } = await params
  const t = await getTranslations('feed')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name')
    .eq('slug', slug)
    .single()
  if (!group) notFound()

  // Check membership
  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role, status')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.status !== 'active') {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{t('noPostsDesc')}</p>
        <p className="text-sm mt-2">Join this group to see its feed.</p>
      </main>
    )
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, title_ml, body, body_ml, created_at, is_pinned, author_id, profiles(full_name)')
    .eq('group_id', group.id)
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{group.name}</h1>
      </div>
      <div className="space-y-4">
        {posts?.map((post) => (
          <article key={post.id} className="rounded-xl border bg-card p-4 shadow-sm">
            {post.is_pinned && (
              <span className="text-xs font-medium text-brand-900 mb-2 block">
                📌 {t('pinned')}
              </span>
            )}
            {/* Title — Malayalam first if present */}
            {(post.title_ml || post.title) && (
              <div className="mb-1 space-y-0.5">
                {post.title_ml && (
                  <h2 className="font-semibold font-malayalam" lang="ml">{post.title_ml}</h2>
                )}
                {post.title && (
                  <h2 className={`font-semibold ${post.title_ml ? 'text-sm text-muted-foreground' : ''}`}>
                    {post.title}
                  </h2>
                )}
              </div>
            )}
            {/* Body — Malayalam first if present */}
            {post.body_ml && (
              <p className="text-sm font-malayalam whitespace-pre-wrap mb-1" lang="ml">{post.body_ml}</p>
            )}
            <p className={`text-sm whitespace-pre-wrap ${post.body_ml ? 'text-muted-foreground' : ''}`}>
              {post.body}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(post.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </article>
        ))}
        {(!posts || posts.length === 0) && (
          <div className="text-center py-12">
            <p className="font-medium">{t('noPostsTitle')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('noPostsDesc')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
