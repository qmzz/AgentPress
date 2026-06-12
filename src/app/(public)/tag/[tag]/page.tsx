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
  const tag = decodeURIComponent(params.tag);
  return {
    title: `#${tag}`,
    description: `Published AgentPress content tagged #${tag}.`,
  };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const items = await getContentsByTag(tag);

  return (
    <div className="container-wide py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-brand-600" />
          <h1 className="text-3xl font-bold text-slate-900">#{tag}</h1>
        </div>
        <p className="mt-2 text-slate-500">{items.length} published items</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Tag className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-medium text-slate-900">No content tagged #{tag}</p>
          <p className="mt-2 text-sm text-slate-500">Nothing published under this tag yet. Try exploring other topics.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/topics"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
            >
              <Tag className="h-4 w-4" />
              Browse topics
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Search className="h-4 w-4" />
              Search content
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
