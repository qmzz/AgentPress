/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { contents, contentVersions } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function saveContentVersion(contentId: string) {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (!content) return null;

  const [lastVersion] = await db.select({ versionNumber: contentVersions.versionNumber }).from(contentVersions).where(eq(contentVersions.contentId, contentId)).orderBy(desc(contentVersions.versionNumber)).limit(1);

  const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;

  const [version] = await db.insert(contentVersions).values({
    contentId: content.id,
    versionNumber: nextVersion,
    title: content.title,
    summary: content.summary,
    blocks: content.blocks,
    tags: content.tags,
    language: content.language,
  }).returning();

  return version;
}

export async function getContentVersions(contentId: string) {
  return db.select().from(contentVersions).where(eq(contentVersions.contentId, contentId)).orderBy(desc(contentVersions.versionNumber));
}

export async function getContentVersion(contentId: string, versionNumber: number) {
  const [version] = await db
    .select()
    .from(contentVersions)
    .where(and(eq(contentVersions.contentId, contentId), eq(contentVersions.versionNumber, versionNumber)))
    .limit(1);
  return version ?? null;
}
