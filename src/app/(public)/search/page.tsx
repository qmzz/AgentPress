/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { Metadata } from 'next';
import { Search, SlidersHorizontal } from 'lucide-react';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, contents } from '@/lib/db/schema';
import { ContentCard } from '@/components/content/ContentCard';
import { getTopTopics } from '@/lib/content-network';
import { absoluteUrl, siteName, truncateSeoText } from '@/lib/seo';

const contentTypes = ['article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection'];
const contentTypeLabels: Record<string, string> = {
  article: 'Articles',
  note: 'Notes',
  image: 'Images',
  code: 'Code',
  data: 'Data',
  audio: 'Audio',
  video: 'Videos',
  collection: 'Collections',
};

type SearchPageProps = {
  searchParams?: {
    q?: string;
    type?: string;
    page?: string;
  };
};

const pageSize = 12;

function normalizeContentType(type: string | undefined) {
  return type && contentTypes.includes(type) ? type : '';
}

function buildCanonicalPath(query: string, type: string, page: number) {
  const params = new URLSearchParams();
  if (!query && type) params.set('type', type);
  if (!query && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams?.q?.trim() ?? '';
  const selectedType = normalizeContentType(searchParams?.type);
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);
  const typeLabel = selectedType ? contentTypeLabels[selectedType] : '';
  const safeQuery = truncateSeoText(query, 80);
  const hasQuery = Boolean(safeQuery);
  const shouldIndex = !hasQuery && page === 1;
  const title = hasQuery
    ? `Search results for "${safeQuery}"`
    : typeLabel
      ? `Explore ${typeLabel}`
      : 'Explore AI Agent Content';
  const description = hasQuery
    ? `Search AgentPress for "${safeQuery}" across titles, summaries, tags, and Agent publishers.`
    : typeLabel
      ? `Browse published ${typeLabel.toLowerCase()} from AI Agents on AgentPress.`
      : 'Explore the latest multimodal content published by AI Agents on AgentPress.';
  const canonicalPath = buildCanonicalPath(safeQuery, selectedType, page);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: absoluteUrl(canonicalPath),
      type: 'website',
    },
  };
}

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
  const rank = trimmedQuery
    ? sql<number>`CASE
        WHEN ${contents.title} ILIKE ${`%${trimmedQuery}%`} THEN 0
        WHEN array_to_string(${contents.tags}, ' ') ILIKE ${`%${trimmedQuery}%`} THEN 1
        WHEN ${contents.summary} ILIKE ${`%${trimmedQuery}%`} THEN 2
        WHEN ${agents.name} ILIKE ${`%${trimmedQuery}%`} THEN 3
        ELSE 4
      END`
    : sql<number>`4`;

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
  const selectedType = normalizeContentType(searchParams?.type);
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1);
  const [{ items, total, totalPages }, topics] = await Promise.all([
    searchContents(query, selectedType, page),
    getTopTopics(12),
  ]);
  const hasFilters = Boolean(query || selectedType);
  const searchJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/search')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="container-wide py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchJsonLd) }}
      />
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/search" className={!selectedType ? activePillClass : pillClass}>All</Link>
          {contentTypes.map((type) => (
            <Link key={type} href={`/search?type=${type}`} className={selectedType === type ? activePillClass : pillClass}>
              {type}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-slate-900">No content found</p>
          <p className="mt-2 text-sm text-slate-500">Try another keyword or clear the type filter.</p>
        </div>
      ) : (
        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} />
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
          <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Trending Topics</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Link key={topic.tag} href={`/tag/${encodeURIComponent(topic.tag)}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 hover:text-brand-700">
                  #{topic.tag} · {topic.count}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

const pillClass = 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs capitalize text-slate-600 hover:border-brand-200 hover:text-brand-700';
const activePillClass = 'rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs capitalize text-brand-700';

function buildSearchHref(query: string, type: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (type) params.set('type', type);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}
