/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Single source of truth for content status transitions.
 *
 * Every status change goes through `transitionContent`. The transition runs in a
 * transaction that (1) locks the content row with SELECT ... FOR UPDATE, (2) checks
 * the current status against the transition's allowed source states, and (3) applies
 * the UPDATE with a redundant `status IN (...)` guard. Concurrent callers therefore
 * serialise on the row lock and all but the first observe the post-commit status,
 * which makes the guard reject them instead of double-applying side effects such as
 * `agents.total_published + 1`.
 *
 * Webhooks are dispatched only after the transaction commits, so an outbound HTTP
 * call can never hold a database transaction open or fire for a rolled-back change.
 */
import { db } from '@/lib/db';
import { agents, contents, contentReviews } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { notifyAgentWebhook, type AgentWebhookEvent } from '@/lib/webhook';

export const CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'flagged',
  'rejected',
  'archived',
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ContentRow = typeof contents.$inferSelect;
export type ContentReviewRow = typeof contentReviews.$inferSelect;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Named transitions. The name carries the authority of the caller (agent / auto
 * review / admin) so the allowed source states can differ per caller even when the
 * target status is identical.
 */
export type ContentTransition =
  | 'submit'
  | 'l1_flag'
  | 'l1_reject'
  | 'l2_approve'
  | 'l2_flag'
  | 'l2_reject'
  | 'admin_approve'
  | 'admin_reject'
  | 'force_publish'
  | 'moderate_flag'
  | 'archive';

interface TransitionSpec {
  from: readonly ContentStatus[];
  to: ContentStatus;
  /** Stamp `published_at` and bump the author's `total_published` counter. */
  publishes?: boolean;
  event?: AgentWebhookEvent;
}

const TRANSITIONS: Record<ContentTransition, TransitionSpec> = {
  // Agent resubmits for review. `rejected` is included so an agent can fix the
  // problem and try again; published and archived content cannot re-enter review.
  submit: {
    from: ['draft', 'flagged', 'rejected'],
    to: 'pending_review',
    event: 'content.submitted',
  },

  // L1 rule review found issues worth a human look.
  l1_flag: {
    from: ['draft', 'pending_review'],
    to: 'flagged',
    event: 'content.flagged',
  },

  // L1 rule review refused the content outright.
  l1_reject: {
    from: ['draft', 'pending_review'],
    to: 'rejected',
    event: 'content.rejected',
  },

  // L2 (AI or rule) approved. Published content is not re-published.
  l2_approve: {
    from: ['draft', 'pending_review', 'flagged', 'rejected'],
    to: 'published',
    publishes: true,
    event: 'content.approved',
  },

  // L2 wants a human look. Allowed from `published` because an admin can re-run L2
  // on live content as a moderation action.
  l2_flag: {
    from: ['draft', 'pending_review', 'published', 'flagged', 'rejected'],
    to: 'flagged',
    event: 'content.flagged',
  },

  // L2 refused. Must NOT reverse a published state (codex review H-04).
  l2_reject: {
    from: ['draft', 'pending_review', 'flagged'],
    to: 'rejected',
    event: 'content.rejected',
  },

  // An admin may override an earlier rejection, so `rejected` is an allowed source.
  admin_approve: {
    from: ['draft', 'pending_review', 'flagged', 'rejected'],
    to: 'published',
    publishes: true,
    event: 'content.approved',
  },

  // Must NOT reverse a published state. Use `moderate_flag` to pull live content.
  admin_reject: {
    from: ['draft', 'pending_review', 'flagged'],
    to: 'rejected',
    event: 'content.rejected',
  },

  // Trusted/verified agent bypasses review. Archived content must not be pushed live,
  // and `rejected` is deliberately excluded: an agent must not be able to overturn an
  // explicit rejection by force publishing. Fix and resubmit instead.
  force_publish: {
    from: ['draft', 'pending_review', 'flagged'],
    to: 'published',
    publishes: true,
    event: 'content.published',
  },

  // Report handling: pull published content back for moderation.
  moderate_flag: {
    from: ['draft', 'pending_review', 'published', 'flagged', 'rejected'],
    to: 'flagged',
    event: 'content.flagged',
  },

  // Soft delete by the owning agent.
  archive: {
    from: ['draft', 'pending_review', 'published', 'flagged', 'rejected'],
    to: 'archived',
  },
};

export interface ReviewRecordInput {
  reviewer: string;
  verdict: 'approved' | 'rejected' | 'flagged';
  reason?: string | null;
  score?: Record<string, number>;
}

export interface TransitionInput {
  contentId: string;
  transition: ContentTransition;
  /** Written atomically with the status change, inside the same transaction. */
  review?: ReviewRecordInput | null;
  /** System-computed confidence. Never an agent-supplied value. */
  confidence?: number | null;
  /** Restrict the transition to content owned by this agent (403 otherwise). */
  requireAgentId?: string;
  /** Dispatch the transition's webhook after commit. Defaults to true. */
  notify?: boolean;
  /** Override the webhook event for this transition. */
  event?: AgentWebhookEvent;
}

export type TransitionResult =
  | {
      ok: true;
      content: ContentRow;
      previousStatus: ContentStatus;
      review: ContentReviewRow | null;
      published: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: 'not_found' | 'forbidden' | 'conflict';
      currentStatus?: ContentStatus;
    };

export async function transitionContent(input: TransitionInput): Promise<TransitionResult> {
  const spec = TRANSITIONS[input.transition];
  if (!spec) {
    return { ok: false, status: 500, error: `Unknown transition: ${input.transition}`, code: 'conflict' };
  }

  const result = await db.transaction(async (tx) => applyTransition(tx, input, spec));

  if (result.ok && (input.notify ?? true)) {
    const event = input.event ?? spec.event;
    if (event) {
      await notifyAgentWebhook({
        agentId: result.content.agentId,
        event,
        content: {
          id: result.content.id,
          slug: result.content.slug,
          title: result.content.title,
          status: result.content.status,
        },
        review: result.review ?? undefined,
      });
    }
  }

  return result;
}

async function applyTransition(
  tx: Tx,
  input: TransitionInput,
  spec: TransitionSpec
): Promise<TransitionResult> {
  // Serialise concurrent transitions on this row. Under READ COMMITTED a blocked
  // waiter re-reads the committed row version once the lock is released, so the
  // guard below sees the winner's status rather than a stale snapshot.
  const [current] = await tx
    .select({ id: contents.id, agentId: contents.agentId, status: contents.status })
    .from(contents)
    .where(eq(contents.id, input.contentId))
    .limit(1)
    .for('update');

  if (!current) {
    return { ok: false, status: 404, error: 'Content not found', code: 'not_found' };
  }

  if (input.requireAgentId && current.agentId !== input.requireAgentId) {
    return { ok: false, status: 403, error: 'Forbidden', code: 'forbidden' };
  }

  const currentStatus = (current.status ?? 'draft') as ContentStatus;

  if (!spec.from.includes(currentStatus)) {
    return {
      ok: false,
      ...rejectionFor(currentStatus, spec, input.transition),
      code: 'conflict',
      currentStatus,
    };
  }

  const now = new Date();
  const publishes = spec.publishes === true;

  const [updated] = await tx
    .update(contents)
    .set({
      status: spec.to,
      updatedAt: now,
      ...(publishes ? { publishedAt: now } : {}),
      ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
    })
    .where(
      // Redundant with the lock above, but keeps the guard in the write itself so a
      // future caller cannot skip it.
      and(eq(contents.id, input.contentId), inArray(contents.status, [...spec.from]))
    )
    .returning();

  if (!updated) {
    return {
      ok: false,
      status: 409,
      error: 'Content status changed concurrently, please retry',
      code: 'conflict',
      currentStatus,
    };
  }

  let review: ContentReviewRow | null = null;
  if (input.review) {
    const [inserted] = await tx
      .insert(contentReviews)
      .values({
        contentId: updated.id,
        reviewer: input.review.reviewer,
        verdict: input.review.verdict,
        reason: input.review.reason ?? undefined,
        score: input.review.score ?? {},
      })
      .returning();
    review = inserted ?? null;
  }

  if (publishes) {
    await tx
      .update(agents)
      .set({ totalPublished: sql`${agents.totalPublished} + 1`, updatedAt: now })
      .where(eq(agents.id, updated.agentId));
  }

  return {
    ok: true,
    content: updated,
    previousStatus: currentStatus,
    review,
    published: publishes,
  };
}

/**
 * Transitions reachable from the public agent API. Their rejections keep the
 * pre-state-machine 4xx contract so existing agent integrations do not break.
 */
const AGENT_FACING: ReadonlySet<ContentTransition> = new Set(['submit', 'force_publish', 'archive']);

function rejectionFor(
  currentStatus: ContentStatus,
  spec: TransitionSpec,
  transition: ContentTransition
): { status: number; error: string } {
  if (currentStatus === 'published' && spec.to === 'published') {
    return { status: 400, error: 'Already published' };
  }
  if (currentStatus === 'archived') {
    return {
      status: 400,
      error: transition === 'submit' ? 'Cannot submit archived content' : 'Cannot modify archived content',
    };
  }
  if (currentStatus === 'published') {
    return AGENT_FACING.has(transition)
      ? { status: 400, error: 'Content is already published' }
      : { status: 409, error: `Cannot ${transition} content that is already published` };
  }
  return { status: 409, error: `Cannot ${transition} content in status ${currentStatus}` };
}

/** Source states a transition accepts. Exported for tests and docs. */
export function allowedSourceStates(transition: ContentTransition): readonly ContentStatus[] {
  return TRANSITIONS[transition].from;
}

/** Target state of a transition. Exported for tests and docs. */
export function targetState(transition: ContentTransition): ContentStatus {
  return TRANSITIONS[transition].to;
}

/** Whether a transition is legal from a given status, without touching the database. */
export function canTransition(transition: ContentTransition, from: ContentStatus): boolean {
  return TRANSITIONS[transition].from.includes(from);
}

/**
 * Initial status for freshly created content, based on the L1 verdict.
 *
 * L1 already separates outright refusal (`rejected`, quality < 0.3) from
 * "needs a human look" (`flagged`), so the resting state keeps that distinction
 * instead of collapsing both into `flagged`.
 */
export function initialContentStatus(verdict: 'approved' | 'rejected' | 'flagged'): ContentStatus {
  switch (verdict) {
    case 'approved':
      return 'draft';
    case 'rejected':
      return 'rejected';
    case 'flagged':
      return 'flagged';
  }
}
