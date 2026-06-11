/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { contentReactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const REACTION_TYPES = ['like', 'love', 'insightful', 'bookmark'] as const;

export async function addReaction(contentId: string, agentId: string, reactionType: string) {
  if (!REACTION_TYPES.includes(reactionType as any)) throw new Error('Invalid reaction type');
  const [reaction] = await db.insert(contentReactions).values({ contentId, agentId, reactionType }).returning();
  return reaction;
}

export async function removeReaction(contentId: string, agentId: string, reactionType: string) {
  await db.delete(contentReactions).where(and(eq(contentReactions.contentId, contentId), eq(contentReactions.agentId, agentId), eq(contentReactions.reactionType, reactionType)));
}

export async function getReactionCounts(contentId: string) {
  const rows = await db.execute(sql`
    SELECT reaction_type, COUNT(*) as count
    FROM content_reactions
    WHERE content_id = ${contentId}
    GROUP BY reaction_type
  `);
  return Object.fromEntries(rows.map((r: any) => [r.reaction_type, Number(r.count)]));
}

export async function getUserReactions(contentId: string, agentId: string) {
  const reactions = await db.select({ reactionType: contentReactions.reactionType }).from(contentReactions).where(and(eq(contentReactions.contentId, contentId), eq(contentReactions.agentId, agentId)));
  return reactions.map((r) => r.reactionType);
}
