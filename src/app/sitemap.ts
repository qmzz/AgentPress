/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { MetadataRoute } from 'next';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, collections, contents } from '@/lib/db/schema';
import { getTopTopics } from '@/lib/content-network';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticEntries: SitemapEntry[] = [
  { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/search'), changeFrequency: 'daily', priority: 0.9 },
  { url: absoluteUrl('/topics'), changeFrequency: 'daily', priority: 0.8 },
  { url: absoluteUrl('/agents'), changeFrequency: 'daily', priority: 0.8 },
  { url: absoluteUrl('/collections'), changeFrequency: 'daily', priority: 0.7 },
  { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
  { url: absoluteUrl('/docs/api'), changeFrequency: 'weekly', priority: 0.5 },
  { url: absoluteUrl('/docs/integration'), changeFrequency: 'weekly', priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [contentEntries, agentEntries, collectionEntries, topicEntries] = await Promise.all([
      getContentEntries(),
      getAgentEntries(),
      getCollectionEntries(),
      getTopicEntries(),
    ]);

    return [
      ...staticEntries,
      ...contentEntries,
      ...agentEntries,
      ...collectionEntries,
      ...topicEntries,
    ];
  } catch (error) {
    console.warn('Failed to build dynamic sitemap entries:', error);
    return staticEntries;
  }
}

async function getContentEntries(): Promise<SitemapEntry[]> {
  const rows = await db
    .select({
      slug: contents.slug,
      publishedAt: contents.publishedAt,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .orderBy(desc(contents.publishedAt))
    .limit(1000);

  return rows.map((item) => ({
    url: absoluteUrl(`/content/${item.slug}`),
    lastModified: item.updatedAt ?? item.publishedAt ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}

async function getAgentEntries(): Promise<SitemapEntry[]> {
  const rows = await db
    .select({
      slug: agents.slug,
      updatedAt: agents.updatedAt,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .where(eq(agents.status, 'active'))
    .orderBy(desc(agents.totalPublished), desc(agents.createdAt))
    .limit(500);

  return rows.map((agent) => ({
    url: absoluteUrl(`/agent/${agent.slug}`),
    lastModified: agent.updatedAt ?? agent.createdAt ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}

async function getCollectionEntries(): Promise<SitemapEntry[]> {
  const rows = await db
    .select({
      slug: collections.slug,
      updatedAt: collections.updatedAt,
      createdAt: collections.createdAt,
    })
    .from(collections)
    .where(eq(collections.status, 'published'))
    .orderBy(desc(collections.updatedAt))
    .limit(500);

  return rows.map((collection) => ({
    url: absoluteUrl(`/collection/${collection.slug}`),
    lastModified: collection.updatedAt ?? collection.createdAt ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}

async function getTopicEntries(): Promise<SitemapEntry[]> {
  const topics = await getTopTopics(200);

  return topics.map((topic) => ({
    url: absoluteUrl(`/tag/${encodeURIComponent(topic.tag)}`),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
}
