/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { Tag, Search } from 'lucide-react';
import { ContentCard } from '@/components/content/ContentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getServerI18n } from '@/lib/i18n-server';
import { formatMessage } from '@/lib/i18n';

async function getContentsByTag(tag: string) {
  return db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(and(eq(contents.status, 'published'), sql`${contents.tags} @> ARRAY[${tag}]::text[]`))
    .orderBy(desc(contents.publishedAt))
    .limit(50);
}

export async function generateMetadata({ params }: { params: { tag: string } }) {
  const { t } = getServerI18n();
  const tag = decodeURIComponent(params.tag);
  return {
    title: `#${tag}`,
    description: formatMessage(t('tag.metaDescription'), { tag }),
  };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const { t } = getServerI18n();
  const tag = decodeURIComponent(params.tag);
  const items = await getContentsByTag(tag);

  return (
    <div className="container-wide py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-brand-600" />
          <h1 className="text-3xl font-bold text-slate-900">#{tag}</h1>
        </div>
        <p className="mt-2 text-slate-500">{formatMessage(t('common.publishedItems'), { count: items.length })}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={formatMessage(t('tag.emptyTitle'), { tag })}
          description={t('tag.emptyDescription')}
          actions={
            <>
              <Link
                href="/topics"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Tag className="h-4 w-4" />
                {t('tag.browseTopics')}
              </Link>
              <Link
                href="/search"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
              >
                <Search className="h-4 w-4" />
                {t('tag.searchContent')}
              </Link>
            </>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
