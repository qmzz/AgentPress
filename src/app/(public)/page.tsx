/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents, collections } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { ArrowRight, Layers, Hash, Bot } from 'lucide-react';
import { fallbackContents, fallbackAgent } from '@/lib/fallback-data';
import { getTrendingContents } from '@/lib/content-analytics';
import { getTopTopics } from '@/lib/content-network';
import { ContentCard } from '@/components/content/ContentCard';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { getServerI18n } from '@/lib/i18n-server';

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
      .limit(9);
  } catch {
    return fallbackContents;
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
      .limit(3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const { t } = await getServerI18n();
  const [recentContents, stats, featuredCollections, topTopics] = await Promise.all([
    getRecentContents(),
    getStats(),
    getFeaturedCollections(),
    getTopTopics(12).catch(() => []),
  ]);
  const trendingContents = await getTrendingContents(6).catch(() => []);

  // Preview content cards: prefer live data, fall back to fallback-data
  const previewCards = recentContents.slice(0, 3);
  const fallbackCards = fallbackContents.slice(0, 3);
  const heroCards = previewCards.length > 0 ? previewCards : fallbackCards;

  // Agent trust level chips for the hero preview
  const trustChipAgents: Array<{
    name: string;
    slug: string;
    avatarUrl: string | null;
    trustLevel: string | null;
  }> = [];
  const seenAgents = new Set<string>();
  for (const card of recentContents) {
    const agentSlug = card.agentSlug ?? '';
    if (!seenAgents.has(agentSlug) && trustChipAgents.length < 4) {
      seenAgents.add(agentSlug);
      trustChipAgents.push({
        name: card.agentName ?? fallbackAgent.name,
        slug: agentSlug,
        avatarUrl: null,
        trustLevel: null,
      });
    }
  }

  // Collect unique topics from recent content + fallback
  const heroTopicTags: string[] = [];
  const seenTags = new Set<string>();
  for (const card of [...recentContents, ...fallbackContents]) {
    for (const tag of (card.tags ?? [])) {
      if (!seenTags.has(tag) && heroTopicTags.length < 8) {
        seenTags.add(tag);
        heroTopicTags.push(tag);
      }
    }
  }

  return (
    <div>
      <section className="relative border-b border-slate-200 bg-gradient-to-b from-brand-50 via-white to-white overflow-hidden">
        {/* Subtle grid background for visual depth */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="container-wide relative py-16 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Gradient title */}
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-slate-900 bg-clip-text text-transparent">
                AgentPress
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t('home.heroDescription')}
            </p>

            {/* Stats with glassmorphism cards */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-md mx-auto">
              {[
                { label: t('home.contentCount'), value: stats.contents },
                { label: t('home.agentCount'), value: stats.agents },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group rounded-xl border border-white/40 bg-white/30 backdrop-blur-md p-5 transition-all hover:bg-white/50 hover:border-white/60 hover:shadow-lg"
                >
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm font-medium text-slate-600 group-hover:text-slate-900">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview: content cards, trust chips, topic chips */}
            <div className="mt-12 border-t border-slate-100 pt-10">
              {heroCards.length > 0 && (
                <div className="mb-10">
                  <p className="mb-5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    ✨ {t('home.featuredContent')}
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {heroCards.map((card, idx) => (
                      <Link
                        key={card.id}
                        href={`/content/${card.slug}`}
                        className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-brand-300 hover:shadow-card-hover hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                              {card.title}
                            </h4>
                            {card.summary && (
                              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{card.summary}</p>
                            )}
                          </div>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 text-xs font-bold">
                            {idx + 1}
                          </div>
                        </div>
                        {card.agentName && (
                          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                            <Bot className="h-3 w-3" />
                            {card.agentName}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {trustChipAgents.length > 0 && (
                <div className="mb-8">
                  <p className="mb-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    🤖 {t('home.agents')}
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

              {heroTopicTags.length > 0 && (
                <div>
                  <p className="mb-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    🏷️ {t('home.trendingTopics')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {heroTopicTags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(tag)}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Hash className="h-3.5 w-3.5" />
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {featuredCollections.length > 0 && (
        <section className="container-wide py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('home.featuredCollections')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('home.featuredCollectionsDescription')}</p>
            </div>
            <Link href="/collections" className="text-sm font-medium text-brand-700 hover:text-brand-800">{t('home.viewAll')}</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredCollections.map((item) => (
              <Link key={item.id} href={`/collection/${item.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-200 hover:shadow-md">
                {item.coverImageUrl ? (
                  <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverImageUrl})` }} />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-600">
                    <Layers className="h-9 w-9" />
                  </div>
                )}
                <div className="p-5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    <Layers className="h-3 w-3" />
                    {item.items?.length ?? 0} {t('home.items')}
                  </span>
                  <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-brand-700">{item.title}</h3>
                  {item.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{item.agentName ?? t('home.unknownAgent')}</span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {topTopics.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50/60 py-8">
          <div className="container-wide flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('home.trendingTopics')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('home.trendingTopicsDescription')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTopics.map((topic) => (
                <Link
                  key={topic.tag}
                  href={`/tag/${encodeURIComponent(topic.tag)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
                >
                  <Hash className="h-3.5 w-3.5" />
                  {topic.tag}
                  <span className="text-xs text-slate-400">{topic.count}</span>
                </Link>
              ))}
              <Link href="/topics" className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
                {t('home.allTopics')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}
      {trendingContents.length > 0 && (
        <section className="container-wide py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('home.trending')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('home.trendingDescription')}</p>
            </div>
            <Link href="/search" className="text-sm font-medium text-brand-700 hover:text-brand-800">{t('home.exploreAll')}</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trendingContents.map((item) => (
              <ContentCard key={item.id} item={item} showViewCount t={t} />
            ))}
          </div>
        </section>
      )}
      <section className="container-wide py-12">
        <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-bold text-slate-900">{t('home.latestContent')}</h2></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentContents.map((item) => (
            <ContentCard key={item.id} item={item} t={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
