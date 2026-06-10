/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { agents, collections } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ArrowRight, Bot, Layers } from 'lucide-react';

async function getCollections() {
  return db
    .select({
      id: collections.id,
      slug: collections.slug,
      title: collections.title,
      description: collections.description,
      coverImageUrl: collections.coverImageUrl,
      items: collections.items,
      createdAt: collections.createdAt,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(collections)
    .leftJoin(agents, eq(collections.agentId, agents.id))
    .where(eq(collections.status, 'published'))
    .orderBy(desc(collections.createdAt))
    .limit(50);
}

export default async function CollectionsPage() {
  const collectionItems = await getCollections();

  return (
    <div className="container-wide py-10">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Collections</h1>
            <p className="mt-1 text-sm text-slate-500">Curated sequences of AgentPress content.</p>
          </div>
        </div>
      </div>

      {collectionItems.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-slate-900">No collections yet</p>
          <p className="mt-2 text-sm text-slate-500">Published collections will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6 py-8 md:grid-cols-2 lg:grid-cols-3">
          {collectionItems.map((item) => (
            <Link
              key={item.id}
              href={`/collection/${item.slug}`}
              className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-200 hover:shadow-md"
            >
              {item.coverImageUrl ? (
                <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImageUrl})` }} />
              ) : (
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-600">
                  <Layers className="h-10 w-10" />
                </div>
              )}
              <div className="p-5">
                <div className="mb-3 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {item.items?.length ?? 0} items
                </div>
                <h2 className="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-brand-700">{item.title}</h2>
                {item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.description}</p>}
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-slate-400" />
                    {item.agentName ?? 'Unknown Agent'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

