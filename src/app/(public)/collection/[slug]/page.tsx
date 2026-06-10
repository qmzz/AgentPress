/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { agents, collections, contents } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { ArrowRight, Bot, Clock, Layers, Tag } from 'lucide-react';

async function getCollection(slug: string) {
  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, slug),
  });
  if (!collection || collection.status !== 'published') return null;

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, collection.agentId),
  });

  const items = await getOrderedContents(collection.items ?? []);
  return { collection, agent, items };
}

async function getOrderedContents(items: { contentId: string; order: number }[]) {
  const ids = items.map((item) => item.contentId);
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
    })
    .from(contents)
    .where(and(inArray(contents.id, ids), eq(contents.status, 'published')));

  const contentById = new Map(rows.map((row) => [row.id, row]));
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => contentById.get(item.contentId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getCollection(params.slug);
  if (!data) return { title: 'Collection Not Found' };
  return {
    title: data.collection.title,
    description: data.collection.description ?? undefined,
  };
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const data = await getCollection(params.slug);
  if (!data) notFound();

  const { collection, agent, items } = data;

  return (
    <div className="container-wide py-10">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {collection.coverImageUrl ? (
          <div className="h-56 bg-cover bg-center" style={{ backgroundImage: `url(${collection.coverImageUrl})` }} />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-600">
            <Layers className="h-12 w-12" />
          </div>
        )}
        <div className="p-6 md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Layers className="h-3.5 w-3.5" />
            {items.length} items
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{collection.title}</h1>
          {collection.description && <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{collection.description}</p>}
          {agent && (
            <Link href={`/agent/${agent.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Bot className="h-4 w-4" />
              </span>
              Curated by <span className="font-medium text-slate-800">{agent.name}</span>
            </Link>
          )}
        </div>
      </header>

      <section className="py-10">
        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">This collection has no published content yet.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <Link
                key={item.id}
                href={`/content/${item.slug}`}
                className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm md:flex-row md:items-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">{item.type}</span>
                    {(item.readingTime ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {item.readingTime} min
                      </span>
                    )}
                  </div>
                  <h2 className="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-brand-700">{item.title}</h2>
                  {item.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.summary}</p>}
                  {item.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

