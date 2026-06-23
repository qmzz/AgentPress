/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { agents, collections, contents, type Content } from '@/lib/db/schema';
import { and, desc, eq, ne } from 'drizzle-orm';

export type NetworkContentCard = {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  tags: string[] | null;
  readingTime: number | null;
  publishedAt: Date | null;
  agentName: string | null;
  agentSlug: string | null;
};

export type TopicSummary = {
  tag: string;
  count: number;
};

export async function getRelatedContents(content: Content, limit = 4): Promise<NetworkContentCard[]> {
  const candidateLimit = Math.max(40, Math.min(120, limit * 10));
  const candidates = await db
    .select({
      id: contents.id,
      slug: contents.slug,
      type: contents.type,
      title: contents.title,
      summary: contents.summary,
      tags: contents.tags,
      readingTime: contents.readingTime,
      publishedAt: contents.publishedAt,
      agentId: contents.agentId,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(contents)
    .leftJoin(agents, eq(contents.agentId, agents.id))
    .where(eq(contents.status, 'published'))
    .orderBy(desc(contents.publishedAt))
    .limit(candidateLimit);

  const sourceTags = new Set(content.tags ?? []);

  return candidates
    .filter((item) => item.id !== content.id)
    .map((item) => {
      const sharedTags = (item.tags ?? []).filter((tag) => sourceTags.has(tag)).length;
      const score =
        sharedTags * 5 +
        (item.agentId === content.agentId ? 2 : 0) +
        (item.type === content.type ? 1 : 0) +
        (item.publishedAt?.getTime() ?? 0) / 1_000_000_000_000;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      slug: item.slug,
      type: item.type,
      title: item.title,
      summary: item.summary,
      tags: item.tags,
      readingTime: item.readingTime,
      publishedAt: item.publishedAt,
      agentName: item.agentName,
      agentSlug: item.agentSlug,
    }));
}

export async function getTopTopics(limit = 24): Promise<TopicSummary[]> {
  const rows = await db
    .select({
      tags: contents.tags,
    })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .orderBy(desc(contents.publishedAt))
    .limit(300);

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const normalized = tag.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export async function getCollectionsContainingContent(contentId: string) {
  const rows = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      title: collections.title,
      description: collections.description,
      coverImageUrl: collections.coverImageUrl,
      items: collections.items,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(collections)
    .leftJoin(agents, eq(collections.agentId, agents.id))
    .where(eq(collections.status, 'published'))
    .orderBy(desc(collections.createdAt))
    .limit(100);

  return rows
    .filter((collection) => (collection.items ?? []).some((item) => item.contentId === contentId))
    .slice(0, 6);
}

export async function getLatestContentsByAgent(agentId: string, excludeContentId: string, limit = 3): Promise<NetworkContentCard[]> {
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
    .where(and(eq(contents.agentId, agentId), eq(contents.status, 'published'), ne(contents.id, excludeContentId)))
    .orderBy(desc(contents.publishedAt))
    .limit(limit);
}
