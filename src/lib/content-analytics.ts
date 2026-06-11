/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { createHash } from 'crypto';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, contents, pageViews } from '@/lib/db/schema';

export type ContentViewHeaders = Pick<Headers, 'get'>;

export type ContentViewSummary = {
  total: number;
  recent7d: number;
};

export type TrendingContentCard = {
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
  agentAvatar: string | null;
  viewCount: number;
};

export async function recordContentView(input: {
  contentId: string;
  agentId: string;
  headers: ContentViewHeaders;
  dedupeWindowMs?: number;
}) {
  try {
    const userAgent = input.headers.get('user-agent') ?? 'unknown';
    if (isLikelyBot(userAgent)) return { recorded: false, reason: 'bot' as const };

    const ip = getClientIp(input.headers);
    const ipHash = hashValue(ip);
    const userAgentHash = hashValue(userAgent);
    const dedupeWindowMs = input.dedupeWindowMs ?? 60 * 60 * 1000;
    const windowStart = new Date(Date.now() - dedupeWindowMs);

    const [existing] = await db
      .select({ id: pageViews.id })
      .from(pageViews)
      .where(and(
        eq(pageViews.contentId, input.contentId),
        eq(pageViews.ipHash, ipHash),
        eq(pageViews.userAgentHash, userAgentHash),
        gte(pageViews.viewedAt, windowStart)
      ))
      .limit(1);

    if (existing) return { recorded: false, reason: 'deduped' as const };

    await db.insert(pageViews).values({
      contentId: input.contentId,
      agentId: input.agentId,
      ipHash,
      userAgentHash,
      referrer: truncate(input.headers.get('referer') ?? input.headers.get('referrer'), 500),
    });

    return { recorded: true as const };
  } catch (error) {
    console.warn('Failed to record content view:', error);
    return { recorded: false, reason: 'failed' as const };
  }
}

export async function getContentViewSummary(contentId: string): Promise<ContentViewSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent7d] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(eq(pageViews.contentId, contentId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(and(eq(pageViews.contentId, contentId), gte(pageViews.viewedAt, sevenDaysAgo))),
  ]);

  return {
    total: total[0]?.count ?? 0,
    recent7d: recent7d[0]?.count ?? 0,
  };
}

export async function getContentViewCounts(contentIds: string[]) {
  if (contentIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      contentId: pageViews.contentId,
      count: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(inArray(pageViews.contentId, contentIds))
    .groupBy(pageViews.contentId);

  return new Map(rows.map((row) => [row.contentId, row.count]));
}

export async function getAgentViewSummary(agentId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent7d] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(eq(pageViews.agentId, agentId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(and(eq(pageViews.agentId, agentId), gte(pageViews.viewedAt, sevenDaysAgo))),
  ]);

  return {
    total: total[0]?.count ?? 0,
    recent7d: recent7d[0]?.count ?? 0,
  };
}

export async function getTrendingContents(limit = 6, days = 14): Promise<TrendingContentCard[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      contentId: pageViews.contentId,
      viewCount: sql<number>`count(*)::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.viewedAt, since))
    .groupBy(pageViews.contentId)
    .orderBy(desc(sql<number>`count(*)::int`))
    .limit(limit * 3);

  const ids = rows.map((row) => row.contentId);
  if (ids.length === 0) return [];

  const contentRows = await db
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
    .where(and(inArray(contents.id, ids), eq(contents.status, 'published')));

  const contentById = new Map(contentRows.map((item) => [item.id, item]));
  const merged: TrendingContentCard[] = [];
  for (const row of rows) {
    const item = contentById.get(row.contentId);
    if (item) merged.push({ ...item, viewCount: row.viewCount });
    if (merged.length >= limit) break;
  }
  return merged;
}

export function hashValue(value: string) {
  const salt = process.env.ANALYTICS_HASH_SALT ?? 'agentpress';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function getClientIp(headers: ContentViewHeaders) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers.get('x-real-ip')
    ?? 'unknown';
}

function isLikelyBot(userAgent: string) {
  return /\b(bot|crawler|spider|preview|monitor|uptime|curl|wget)\b/i.test(userAgent);
}

function truncate(value: string | null, max: number) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}
