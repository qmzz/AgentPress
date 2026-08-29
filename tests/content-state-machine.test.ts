/*
 * Design: github.com/qmzz
 * Coding: Claude
 *
 * Two layers of coverage:
 *
 * 1. Transition-table tests. Pure functions, no database, always run. These pin the
 *    rules that the codex review H-04 findings turned on: reject must not reverse a
 *    published state, force publish must not resurrect archived content.
 *
 * 2. Concurrency tests. These need a real Postgres and are skipped without
 *    DATABASE_URL, following the existing convention in core-api.test.ts. They are
 *    the ones that actually prove the row lock works: two simultaneous approves on
 *    one content row must bump agents.total_published exactly once.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedSourceStates,
  canTransition,
  initialContentStatus,
  targetState,
  CONTENT_STATUSES,
  type ContentStatus,
  type ContentTransition,
} from '../src/lib/content-state-machine';

const hasDatabase = Boolean(process.env.DATABASE_URL);

// ─── Transition table (no database) ──────────────────

test('published content cannot be reversed by any reject transition', () => {
  // codex review H-04: reject was able to turn a published content back to flagged.
  assert.equal(canTransition('admin_reject', 'published'), false);
  assert.equal(canTransition('l2_reject', 'published'), false);
  assert.equal(canTransition('l1_reject', 'published'), false);
});

test('pulling published content back requires an explicit moderation transition', () => {
  // The capability still exists, but only under a name that says what it does.
  assert.equal(canTransition('moderate_flag', 'published'), true);
  assert.equal(targetState('moderate_flag'), 'flagged');
});

test('force publish refuses archived content', () => {
  // Previously the check was `status !== 'published'`, so archived content could be
  // pushed live by a trusted agent.
  assert.equal(canTransition('force_publish', 'archived'), false);
  assert.equal(canTransition('force_publish', 'draft'), true);
  assert.equal(canTransition('force_publish', 'flagged'), true);
});

test('no transition accepts archived as a source state', () => {
  const transitions: ContentTransition[] = [
    'submit', 'l1_flag', 'l1_reject', 'l2_approve', 'l2_flag', 'l2_reject',
    'admin_approve', 'admin_reject', 'force_publish', 'moderate_flag', 'archive',
  ];

  for (const transition of transitions) {
    assert.equal(
      canTransition(transition, 'archived'),
      false,
      `${transition} must not accept archived content`
    );
  }
});

test('publishing transitions never start from published', () => {
  const publishing: ContentTransition[] = ['l2_approve', 'admin_approve', 'force_publish'];

  for (const transition of publishing) {
    assert.equal(targetState(transition), 'published');
    assert.equal(
      canTransition(transition, 'published'),
      false,
      `${transition} must not re-publish already published content (double counts total_published)`
    );
  }
});

test('submit re-enters review from any unpublished resting state', () => {
  // rejected is a resting state, not a dead end: the agent can revise and resubmit.
  assert.deepEqual([...allowedSourceStates('submit')], ['draft', 'flagged', 'rejected']);
  assert.equal(canTransition('submit', 'published'), false);
  assert.equal(canTransition('submit', 'archived'), false);
  // pending_review is already queued; resubmitting would re-fire content.submitted.
  assert.equal(canTransition('submit', 'pending_review'), false);
});

test('every reject transition targets rejected, not flagged', () => {
  // Before the split, a refusal and a "needs a human look" were the same status.
  for (const transition of ['l1_reject', 'l2_reject', 'admin_reject'] as ContentTransition[]) {
    assert.equal(targetState(transition), 'rejected', `${transition} must land in rejected`);
  }
  for (const transition of ['l1_flag', 'l2_flag', 'moderate_flag'] as ContentTransition[]) {
    assert.equal(targetState(transition), 'flagged', `${transition} must land in flagged`);
  }
});

test('force publish refuses rejected content', () => {
  // A trusted agent may skip the queue, but not overturn an explicit refusal.
  // Getting out of rejected requires submit, which re-runs review.
  assert.equal(canTransition('force_publish', 'rejected'), false);
  assert.equal(canTransition('submit', 'rejected'), true);
});

test('review can still overturn a rejection', () => {
  // rejected must not trap content: a reviewer with fresh judgment can approve it.
  assert.equal(canTransition('l2_approve', 'rejected'), true);
  assert.equal(canTransition('admin_approve', 'rejected'), true);
  assert.equal(canTransition('archive', 'rejected'), true);
});

test('every transition source and target is a real content status', () => {
  const valid = new Set<string>(CONTENT_STATUSES);
  const transitions: ContentTransition[] = [
    'submit', 'l1_flag', 'l1_reject', 'l2_approve', 'l2_flag', 'l2_reject',
    'admin_approve', 'admin_reject', 'force_publish', 'moderate_flag', 'archive',
  ];

  for (const transition of transitions) {
    assert.ok(valid.has(targetState(transition)), `${transition} target is not a valid status`);
    for (const from of allowedSourceStates(transition)) {
      assert.ok(valid.has(from), `${transition} source ${from} is not a valid status`);
    }
    assert.ok(allowedSourceStates(transition).length > 0, `${transition} has no source states`);
  }
});

test('a transition never lists its own target as a source state', () => {
  // Self-transitions would let a caller re-apply side effects from the resting state.
  // The three *_flag transitions are deliberately absent: re-flagging already flagged
  // content is how a second report lands on the same row.
  const transitions: ContentTransition[] = [
    'submit', 'l1_reject', 'l2_reject', 'admin_reject',
    'l2_approve', 'admin_approve', 'force_publish', 'archive',
  ];

  for (const transition of transitions) {
    assert.equal(
      canTransition(transition, targetState(transition)),
      false,
      `${transition} accepts its own target state as a source`
    );
  }
});

test('fresh content inherits the L1 verdict as its resting state', () => {
  assert.equal(initialContentStatus('approved'), 'draft');
  assert.equal(initialContentStatus('flagged'), 'flagged');
  // L1 rejects below quality 0.3; that refusal survives creation instead of
  // being collapsed into flagged.
  assert.equal(initialContentStatus('rejected'), 'rejected');
});

// ─── Concurrency (needs Postgres) ────────────────────

/**
 * Creates a throwaway agent plus one content row in the given status, runs the body,
 * then removes both. Returns whatever the body returns.
 */
async function withFixture<T>(
  status: ContentStatus,
  body: (ids: { agentId: string; contentId: string }) => Promise<T>
): Promise<T> {
  const { db } = await import('../src/lib/db');
  const { agents, contents, contentReviews } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [agent] = await db
    .insert(agents)
    .values({
      name: `state-machine-test-${suffix}`,
      slug: `state-machine-test-${suffix}`,
      ownerEmail: `state-machine-${suffix}@test.invalid`,
      apiKeyHash: `test-hash-${suffix}`,
      apiKeyPrefix: `ap_test_${suffix.slice(0, 6)}`,
      totalPublished: 0,
    })
    .returning();

  const [content] = await db
    .insert(contents)
    .values({
      agentId: agent.id,
      slug: `state-machine-test-${suffix}`,
      type: 'article',
      title: 'State machine concurrency fixture',
      blocks: [{ type: 'text', content: 'Fixture body long enough to pass L1 checks.' }] as never,
      status,
    })
    .returning();

  try {
    return await body({ agentId: agent.id, contentId: content.id });
  } finally {
    await db.delete(contentReviews).where(eq(contentReviews.contentId, content.id));
    await db.delete(contents).where(eq(contents.id, content.id));
    await db.delete(agents).where(eq(agents.id, agent.id));
  }
}

test('concurrent approves publish once and bump total_published once', { skip: !hasDatabase }, async () => {
  const { transitionContent } = await import('../src/lib/content-state-machine');
  const { db } = await import('../src/lib/db');
  const { agents, contentReviews } = await import('../src/lib/db/schema');
  const { eq, sql } = await import('drizzle-orm');

  await withFixture('pending_review', async ({ agentId, contentId }) => {
    // Fire both approvals at once. Webhooks are skipped: the fixture agent has no
    // webhook_url, so notifyAgentWebhook short-circuits.
    const [first, second] = await Promise.all([
      transitionContent({
        contentId,
        transition: 'admin_approve',
        review: { reviewer: 'human:test-a', verdict: 'approved', score: { quality: 1 } },
      }),
      transitionContent({
        contentId,
        transition: 'admin_approve',
        review: { reviewer: 'human:test-b', verdict: 'approved', score: { quality: 1 } },
      }),
    ]);

    const succeeded = [first, second].filter((r) => r.ok);
    const failed = [first, second].filter((r) => !r.ok);

    assert.equal(succeeded.length, 1, 'exactly one approve should win');
    assert.equal(failed.length, 1, 'the loser should be rejected, not silently applied');

    const [agent] = await db
      .select({ totalPublished: agents.totalPublished })
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    assert.equal(agent.totalPublished, 1, 'total_published must be bumped exactly once');

    // The losing transition must not have left a review record behind either.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentReviews)
      .where(eq(contentReviews.contentId, contentId));

    assert.equal(count, 1, 'only the winning transition should write a review record');
  });
});

test('reject cannot reverse a published content at the database level', { skip: !hasDatabase }, async () => {
  const { transitionContent } = await import('../src/lib/content-state-machine');
  const { db } = await import('../src/lib/db');
  const { contents } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  await withFixture('published', async ({ contentId }) => {
    const outcome = await transitionContent({
      contentId,
      transition: 'admin_reject',
      review: { reviewer: 'human:test', verdict: 'rejected', score: { quality: 0 } },
    });

    assert.equal(outcome.ok, false, 'rejecting published content must fail');

    const [row] = await db
      .select({ status: contents.status })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    assert.equal(row.status, 'published', 'status must be untouched by the failed transition');
  });
});

test('force publish on archived content is refused at the database level', { skip: !hasDatabase }, async () => {
  const { transitionContent } = await import('../src/lib/content-state-machine');
  const { db } = await import('../src/lib/db');
  const { contents } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  await withFixture('archived', async ({ agentId, contentId }) => {
    const outcome = await transitionContent({
      contentId,
      transition: 'force_publish',
      requireAgentId: agentId,
    });

    assert.equal(outcome.ok, false, 'archived content must not be force publishable');

    const [row] = await db
      .select({ status: contents.status })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    assert.equal(row.status, 'archived');
  });
});

test('a failed transition writes no review record', { skip: !hasDatabase }, async () => {
  const { transitionContent } = await import('../src/lib/content-state-machine');
  const { db } = await import('../src/lib/db');
  const { contentReviews } = await import('../src/lib/db/schema');
  const { eq, sql } = await import('drizzle-orm');

  await withFixture('published', async ({ contentId }) => {
    await transitionContent({
      contentId,
      transition: 'submit',
      review: { reviewer: 'auto:l1', verdict: 'approved', score: { quality: 1 } },
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentReviews)
      .where(eq(contentReviews.contentId, contentId));

    assert.equal(count, 0, 'the review insert must roll back with the rejected transition');
  });
});

test('ownership guard blocks transitions from a non-owning agent', { skip: !hasDatabase }, async () => {
  const { transitionContent } = await import('../src/lib/content-state-machine');

  await withFixture('draft', async ({ contentId }) => {
    const outcome = await transitionContent({
      contentId,
      transition: 'force_publish',
      requireAgentId: '00000000-0000-4000-8000-0000000000ff',
    });

    assert.equal(outcome.ok, false);
    if (!outcome.ok) assert.equal(outcome.status, 403);
  });
});
