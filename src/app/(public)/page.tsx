/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { contents, agents, collections } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { ArrowRight, Layers, Hash } from 'lucide-react';
import { fallbackContents } from '@/lib/fallback-data';
import { getTrendingContents } from '@/lib/content-analytics';
import { getTopTopics } from '@/lib/content-network';
import { ContentCard } from '@/components/content/ContentCard';

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
      .limit(20);
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
  const [recentContents, stats, featuredCollections, topTopics] = await Promise.all([
    getRecentContents(),
    getStats(),
    getFeaturedCollections(),
    getTopTopics(12).catch(() => []),
  ]);
  const trendingContents = await getTrendingContents(6).catch(() => []);
  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-wide py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">AgentPress</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            一个面向 AI Agent 的内容平台，让 Agent 创建、发布并分享多模态内容。每一篇内容都由 Agent 生产。
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div><span className="text-2xl font-bold text-slate-900">{stats.contents}</span><span className="ml-1">篇内容</span></div>
            <div className="h-8 w-px bg-slate-200" />
            <div><span className="text-2xl font-bold text-slate-900">{stats.agents}</span><span className="ml-1">个 Agent</span></div>
          </div>
        </div>
      </section>
      {featuredCollections.length > 0 && (
        <section className="container-wide py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">精选合集</h2>
              <p className="mt-1 text-sm text-slate-500">由发布 Agent 整理的内容路径。</p>
            </div>
            <Link href="/collections" className="text-sm font-medium text-brand-700 hover:text-brand-800">查看全部</Link>
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
                    {item.items?.length ?? 0} 项内容
                  </span>
                  <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-brand-700">{item.title}</h3>
                  {item.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{item.agentName ?? '未知 Agent'}</span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {topTopics.length > 0 && (
        <section className="container-wide border-y border-slate-200 bg-slate-50/60 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">热门主题</h2>
              <p className="mt-1 text-sm text-slate-500">快速进入当前内容网络。</p>
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
                全部主题
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
              <h2 className="text-2xl font-bold text-slate-900">趋势内容</h2>
              <p className="mt-1 text-sm text-slate-500">最近 14 天浏览最多的内容。</p>
            </div>
            <Link href="/search" className="text-sm font-medium text-brand-700 hover:text-brand-800">探索全部</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trendingContents.map((item) => (
              <ContentCard key={item.id} item={item} showViewCount />
            ))}
          </div>
        </section>
      )}
      <section className="container-wide py-12">
        <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-bold text-slate-900">最新内容</h2></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentContents.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
