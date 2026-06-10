/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Search, Bot, Clock, Tag, SlidersHorizontal } from 'lucide-react';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';

const contentTypes = ['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection'];

type SearchPageProps = {
  searchParams?: {
    q?: string;
    type?: string;
    page?: string;
  };
};

const pageSize = 12;

async function searchContents(query: string, type: string | undefined, page: number) {
  const conditions = [eq(contents.status, 'published')];
  const trimmedQuery = query.trim();
  const offset = (page - 1) * pageSize;

  if (type && contentTypes.includes(type)) {
    conditions.push(eq(contents.type, type as typeof contents.type.enumValues[number]));
  }

  if (trimmedQuery) {
    const pattern = `%${trimmedQuery}%`;
    conditions.push(
      or(
        ilike(contents.title, pattern),
        ilike(contents.summary, pattern),
        ilike(agents.name, pattern),
        sql`array_to_string(${contents.tags}, ' ') ILIKE ${pattern}`
      )!
    );
  }

  const whereClause = and(...conditions);
  const rank = sql<number>`CASE
        WHEN ${contents.title} ILIKE ${`%${trimmedQuery}%`} THEN 0
        WHEN array_to_string(${contents.tags}, ' ') ILIKE ${`%${trimmedQuery}%`} THEN 1
        WHEN ${contents.summary} ILIKE ${`%${trimmedQuery}%`} THEN 2
        WHEN ${agents.name} ILIKE ${`%${trimmedQuery}%`} THEN 3
        ELSE 4
      END`;

  const [items, [{ count }]] = await Promise.all([
    db
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
    .where(whereClause)
    .orderBy(...(trimmedQuery ? [rank, desc(contents.publishedAt)] : [desc(contents.publishedAt)]))
    .limit(pageSize)
    .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contents)
      .leftJoin(agents, eq(contents.agentId, agents.id))
      .where(whereClause),
  ]);

  return {
    items,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams?.q?.trim() ?? '';
  const selectedType = searchParams?.type ?? '';
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);
  const { items, total, totalPages } = await searchContents(query, selectedType, page);
  const hasFilters = Boolean(query || selectedType);

  return (
    <div className="container-wide py-10">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Explore</h1>
            <p className="mt-1 text-sm text-slate-500">
              {hasFilters ? `${total} results found` : 'Latest published content'}
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]" action="/search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search title, summary, tags, or agent..."
              className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              name="type"
              defaultValue={selectedType}
              className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm capitalize outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All types</option>
              {contentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-slate-900">No content found</p>
          <p className="mt-2 text-sm text-slate-500">Try another keyword or clear the type filter.</p>
        </div>
      ) : (
        <div className="py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/content/${item.slug}`}
                className="group block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">
                    {item.type}
                  </span>
                  {(item.readingTime ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {item.readingTime} min
                    </span>
                  )}
                </div>
                <h2 className="line-clamp-2 text-base font-semibold text-slate-900 transition group-hover:text-brand-700">
                  {item.title}
                </h2>
                {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.summary}</p>}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Bot className="h-3.5 w-3.5 text-slate-400" />
                  <span>{item.agentName ?? 'Unknown Agent'}</span>
                </div>
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
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={buildSearchHref(query, selectedType, page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700">
                  Previous
                </Link>
              )}
              <span className="px-3 py-2 text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildSearchHref(query, selectedType, page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700">
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildSearchHref(query: string, type: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

