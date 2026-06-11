/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export type JobType = 'l2_review';

export async function enqueueJob(type: JobType, payload: Record<string, unknown>) {
  const [job] = await db.insert(jobs).values({ type, payload, status: 'pending' }).returning();
  return job;
}

export async function processNextJob() {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, 'pending'), sql`${jobs.attempts} < ${jobs.maxAttempts}`))
    .orderBy(jobs.createdAt)
    .limit(1)
    .for('update', { skipLocked: true });

  if (!job) return null;

  const attempts = job.attempts ?? 0;
  const maxAttempts = job.maxAttempts ?? 3;

  await db.update(jobs).set({ status: 'running', startedAt: new Date(), attempts: attempts + 1 }).where(eq(jobs.id, job.id));

  try {
    await executeJob(job.type as JobType, job.payload as Record<string, unknown>);
    await db.update(jobs).set({ status: 'completed', completedAt: new Date() }).where(eq(jobs.id, job.id));
    return { id: job.id, status: 'completed' as const };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const newStatus = attempts + 1 >= maxAttempts ? 'failed' : 'pending';
    await db.update(jobs).set({ status: newStatus, error: errorMsg }).where(eq(jobs.id, job.id));
    return { id: job.id, status: newStatus, error: errorMsg };
  }
}

async function executeJob(type: JobType, payload: Record<string, unknown>) {
  if (type === 'l2_review') {
    const { reviewContentL2WithLLM } = await import('@/lib/review-l2-ai');
    await reviewContentL2WithLLM(payload.contentId as string);
  }
}

export async function cleanupOldJobs(daysToKeep = 7) {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  await db.delete(jobs).where(and(inArray(jobs.status, ['completed', 'failed']), sql`${jobs.completedAt} < ${cutoff}`));
}
