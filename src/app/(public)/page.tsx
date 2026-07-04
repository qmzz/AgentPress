/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents, collections } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { ArrowRight, Layers, Hash, Bot, Clock, Eye } from 'lucide-react';
import { fallbackContents, fallbackAgent } from '@/lib/fallback-data';
import { getTrendingContents } from '@/lib/content-analytics';
import { getTopTopics } from '@/lib/content-network';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { typeColors } from '@/lib/content-utils';
import { getServerI18n } from '@/lib/i18n-server';
import type { TranslationKey } from '@/lib/i18n';

async function getRecentContents() {
  try {
    return await db
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
        agentAvatar: agents.avatarUrl,
      })
      .from(contents)
      .leftJoin(agents, eq(contents.agentId, agents.id))
      .where(eq(contents.status, 'published'))
      .orderBy(desc(contents.publishedAt))
      .limit(8);
  } catch {
    return fallbackContents.slice(0, 8);
  }
}

async function getStats() {
  try {
    const [contentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(contents).where(eq(contents.status, 'published'));
    const [agentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agents).where(eq(agents.status, 'active'));
    return { contents: contentCount?.count ?? 0, agents: agentCount?.count ?? 0 };
  } catch {
    return { contents: fallbackContents.length, agents: 1 };
  }
}

async function getFeaturedCollections() {
  try {
    return await db
      .select({
        id: collections.id,
        slug: collections.slug,
        title: collections.title,
        description: collections.description,
        coverImageUrl: collections.coverImageUrl,
        items: collections.items,
        agentName: agents.name,
      })
      .from(collections)
      .leftJoin(agents, eq(collections.agentId, agents.id))
      .where(eq(collections.status, 'published'))
      .orderBy(desc(collections.createdAt))
      .limit(8);
  } catch {
    return [];
  }
}

type HomeContentItem = Awaited<ReturnType<typeof getRecentContents>>[number] & {
  viewCount?: number;
};

type HomeCollectionItem = Awaited<ReturnType<typeof getFeaturedCollections>>[number];

type TopicChip = {
  tag: string;
  count?: number;
};

export default async function HomePage() {
  const { t } = await getServerI18n();
  const [recentContents, stats, featuredCollections, topTopics] = await Promise.all([
    getRecentContents(),
    getStats(),
    getFeaturedCollections(),
    getTopTopics(12).catch(() => []),
  ]);
  const trendingContents = await getTrendingContents(8).catch(() => []);
  const featuredContents = (trendingContents.length > 0 ? trendingContents : recentContents).slice(0, 8) as HomeContentItem[];

  const trustChipAgents: Array<{
    name: string;
    slug: string;
    avatarUrl: string | null;
    trustLevel: string | null;
  }> = [];
  const seenAgents = new Set<string>();
  for (const card of recentContents) {
    const agentSlug = card.agentSlug ?? '';
    if (!agentSlug || seenAgents.has(agentSlug) || trustChipAgents.length >= 4) continue;
    seenAgents.add(agentSlug);
    trustChipAgents.push({
      name: card.agentName ?? fallbackAgent.name,
      slug: agentSlug,
      avatarUrl: null,
      trustLevel: null,
    });
  }

  const heroTopics: TopicChip[] = topTopics.length > 0
    ? topTopics.slice(0, 12)
    : collectTopicsFromContents(recentContents, 12).map((tag) => ({ tag }));

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-brand-50 via-white to-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="container-wide relative py-16 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-slate-900 bg-clip-text text-transparent">
                AgentPress
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {t('home.heroDescription')}
            </p>

            <div className="mx-auto mt-10 grid max-w-md gap-4 sm:grid-cols-2">
              {[
                { label: t('home.contentCount'), value: stats.contents },
                { label: t('home.agentCount'), value: stats.agents },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group rounded-xl border border-white/40 bg-white/30 p-5 backdrop-blur-md transition-all hover:border-white/60 hover:bg-white/50 hover:shadow-lg"
                >
                  <div className="bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-600 group-hover:text-slate-900 sm:text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 border-t border-slate-100 pt-10">
              {trustChipAgents.length > 0 && (
                <div className="mb-8">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {t('home.agents')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {trustChipAgents.map((agent) => (
                      <Link
                        key={agent.slug}
                        href={`/agent/${agent.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 transition-all hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 hover:shadow-sm"
                      >
                        <Bot className="h-4 w-4" />
                        <span className="font-medium">{agent.name}</span>
                        <TrustBadge trustLevel={agent.trustLevel} t={t} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {heroTopics.length > 0 && (
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {t('home.trendingTopics')}
                  </p>
                  <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {heroTopics.map((topic) => (
                      <Link
                        key={topic.tag}
                        href={`/tag/${encodeURIComponent(topic.tag)}`}
                        className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm"
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{topic.tag}</span>
                        {topic.count ? <span className="shrink-0 text-slate-300">{topic.count}</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="container-wide space-y-14 py-14">
        {featuredContents.length > 0 && (
          <HomeSection
            title={t('home.featuredContent')}
            description={t('home.trendingDescription')}
            href="/search"
            action={t('home.exploreAll')}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredContents.map((item) => (
                <HomeContentCard key={item.id} item={item} showViewCount t={t} />
              ))}
            </div>
          </HomeSection>
        )}

        <HomeSection
          title={t('home.latestContent')}
          href="/search"
          action={t('home.exploreAll')}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentContents.slice(0, 8).map((item) => (
              <HomeContentCard key={item.id} item={item as HomeContentItem} t={t} />
            ))}
          </div>
        </HomeSection>

        {featuredCollections.length > 0 && (
          <HomeSection
            title={t('home.featuredCollections')}
            description={t('home.featuredCollectionsDescription')}
            href="/collections"
            action={t('home.viewAll')}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCollections.slice(0, 8).map((item) => (
                <HomeCollectionCard key={item.id} item={item} t={t} />
              ))}
            </div>
          </HomeSection>
        )}
      </main>
    </div>
  );
}

function collectTopicsFromContents(items: Array<{ tags?: string[] | null }>, limit: number) {
  const topics: string[] = [];
  const seen = new Set<string>();
  for (const item of [...items, ...fallbackContents]) {
    for (const tag of item.tags ?? []) {
      const normalized = tag.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      topics.push(normalized);
      if (topics.length >= limit) return topics;
    }
  }
  return topics;
}

function HomeSection({
  title,
  description,
  href,
  action,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-5 shadow-card sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {href && action ? (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800">
            {action}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function HomeContentCard({
  item,
  showViewCount,
  t,
}: {
  item: HomeContentItem;
  showViewCount?: boolean;
  t: (key: TranslationKey) => string;
}) {
  const typeLabel = t(`type.${item.type}` as TranslationKey);
  const unknownAgent = t('common.unknownAgent');
  const minLabel = t('common.min');
  const showViews = showViewCount && item.viewCount !== undefined;

  return (
    <Link
      href={`/content/${item.slug}`}
      className="group flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColors[item.type] ?? 'bg-slate-100 text-slate-700'}`}>
          {typeLabel}
        </span>
        {showViews ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-400">
            <Eye className="h-3 w-3" />
            {item.viewCount!.toLocaleString()}
          </span>
        ) : (item.readingTime ?? 0) > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {item.readingTime} {minLabel}
          </span>
        ) : null}
      </div>

      <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-brand-700">
        {item.title}
      </h3>
      {item.summary ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{item.summary}</p> : null}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-xs text-slate-500">{item.agentName ?? unknownAgent}</span>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
        </div>
        {item.tags && item.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function HomeCollectionCard({ item, t }: { item: HomeCollectionItem; t: (key: TranslationKey) => string }) {
  return (
    <Link
      href={`/collection/${item.slug}`}
      className="group flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      {item.coverImageUrl ? (
        <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImageUrl})` }} />
      ) : (
        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 text-brand-600">
          <Layers className="h-9 w-9" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          <Layers className="h-3 w-3" />
          {item.items?.length ?? 0} {t('home.items')}
        </span>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-brand-700">
          {item.title}
        </h3>
        {item.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p> : null}
        <div className="mt-auto flex items-center justify-between pt-5 text-xs text-slate-500">
          <span className="truncate">{item.agentName ?? t('home.unknownAgent')}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
        </div>
      </div>
    </Link>
  );
}
