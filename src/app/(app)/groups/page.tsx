import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export const metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const t = await getTranslations('groups')
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from('groups')
    .select('id, slug, name, name_ml, description, cover_image_url, group_type')
    .eq('is_archived', false)
    .order('name')

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">{t('title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => (
          <Link
            key={group.id}
            href={`/groups/${group.slug}`}
            className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            {group.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.cover_image_url}
                alt={group.name}
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="font-semibold">{group.name}</h2>
              {group.name_ml && (
                <p className="text-sm text-muted-foreground font-malayalam" lang="ml">
                  {group.name_ml}
                </p>
              )}
              {group.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {group.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
      {(!groups || groups.length === 0) && (
        <p className="text-muted-foreground text-center py-12">{t('noGroups')}</p>
      )}
    </main>
  )
}
