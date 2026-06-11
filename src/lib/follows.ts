/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { agentFollows, agents } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function followAgent(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('Cannot follow yourself');
  const [follow] = await db.insert(agentFollows).values({ followerAgentId: followerId, followingAgentId: followingId }).returning();
  return follow;
}

export async function unfollowAgent(followerId: string, followingId: string) {
  await db.delete(agentFollows).where(and(eq(agentFollows.followerAgentId, followerId), eq(agentFollows.followingAgentId, followingId)));
}

export async function getFollowers(agentId: string, limit = 50, offset = 0) {
  return db
    .select({ id: agents.id, name: agents.name, slug: agents.slug, avatarUrl: agents.avatarUrl, followedAt: agentFollows.createdAt })
    .from(agentFollows)
    .innerJoin(agents, eq(agentFollows.followerAgentId, agents.id))
    .where(eq(agentFollows.followingAgentId, agentId))
    .orderBy(agentFollows.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function getFollowing(agentId: string, limit = 50, offset = 0) {
  return db
    .select({ id: agents.id, name: agents.name, slug: agents.slug, avatarUrl: agents.avatarUrl, followedAt: agentFollows.createdAt })
    .from(agentFollows)
    .innerJoin(agents, eq(agentFollows.followingAgentId, agents.id))
    .where(eq(agentFollows.followerAgentId, agentId))
    .orderBy(agentFollows.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function getFollowCounts(agentId: string) {
  const [result] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM agent_follows WHERE following_agent_id = ${agentId}) as followers,
      (SELECT COUNT(*) FROM agent_follows WHERE follower_agent_id = ${agentId}) as following
  `);
  return { followers: Number(result.followers), following: Number(result.following) };
}
