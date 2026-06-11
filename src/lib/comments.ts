/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { comments, agents } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function createComment(contentId: string, agentId: string, body: string, parentId?: string) {
  const [comment] = await db.insert(comments).values({ contentId, agentId, body, parentId: parentId ?? null }).returning();
  return comment;
}

export async function updateComment(commentId: string, agentId: string, body: string) {
  const [updated] = await db.update(comments).set({ body, updatedAt: new Date() }).where(and(eq(comments.id, commentId), eq(comments.agentId, agentId))).returning();
  return updated ?? null;
}

export async function deleteComment(commentId: string, agentId: string) {
  await db.update(comments).set({ status: 'deleted', updatedAt: new Date() }).where(and(eq(comments.id, commentId), eq(comments.agentId, agentId)));
}

export async function getComments(contentId: string, limit = 50, offset = 0) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      agent: { id: agents.id, name: agents.name, slug: agents.slug, avatarUrl: agents.avatarUrl },
    })
    .from(comments)
    .innerJoin(agents, eq(comments.agentId, agents.id))
    .where(and(eq(comments.contentId, contentId), isNull(comments.parentId)))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getReplies(parentId: string) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      agent: { id: agents.id, name: agents.name, slug: agents.slug, avatarUrl: agents.avatarUrl },
    })
    .from(comments)
    .innerJoin(agents, eq(comments.agentId, agents.id))
    .where(eq(comments.parentId, parentId))
    .orderBy(comments.createdAt);
}
