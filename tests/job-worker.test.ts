import assert from 'node:assert/strict';
import test from 'node:test';

import { dispatchFor, failureOutcome, numberFromEnv } from '../scripts/lib/job-worker-core.mjs';

const CONTENT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

test('a failed attempt retires only once max_attempts is reached', () => {
  // `attempts` has already been incremented by the claim, so it counts the
  // attempt that just failed.
  assert.equal(failureOutcome({ attempts: 1, max_attempts: 3 }).status, 'pending');
  assert.equal(failureOutcome({ attempts: 2, max_attempts: 3 }).status, 'pending');
  assert.equal(failureOutcome({ attempts: 3, max_attempts: 3 }).status, 'failed');
  assert.equal(failureOutcome({ attempts: 4, max_attempts: 3 }).status, 'failed');
});

test('failure outcome reports the attempt counters it decided on', () => {
  const outcome = failureOutcome({ attempts: 3, max_attempts: 3 });
  assert.equal(outcome.exhausted, true);
  assert.equal(outcome.attempts, 3);
  assert.equal(outcome.maxAttempts, 3);
});

test('a job with no attempt budget fails instead of looping forever', () => {
  // Guards the case where max_attempts is missing or zero: treating that as
  // "retry" would put the row straight back in the queue on every pass.
  assert.equal(failureOutcome({ attempts: 1, max_attempts: 0 }).status, 'failed');
  assert.equal(failureOutcome({}).status, 'failed');
});

test('l2_review dispatches to the admin review endpoint', () => {
  assert.deepEqual(dispatchFor({ type: 'l2_review', payload: { contentId: CONTENT_ID } }), {
    method: 'POST',
    path: `/api/v1/admin/contents/${CONTENT_ID}/review`,
  });
});

test('a job payload cannot steer the request at another endpoint', () => {
  // The id is interpolated into a path, so a traversing value must be refused
  // rather than turned into a request somewhere else.
  for (const contentId of ['../../agents/abc/suspend', `${CONTENT_ID}/../../stats`, 'not-a-uuid', '']) {
    assert.throws(
      () => dispatchFor({ type: 'l2_review', payload: { contentId } }),
      /contentId/,
      `must reject contentId: ${JSON.stringify(contentId)}`,
    );
  }
});

test('missing payload and unknown job types throw rather than silently no-op', () => {
  assert.throws(() => dispatchFor({ type: 'l2_review' }), /missing payload\.contentId/);
  assert.throws(() => dispatchFor({ type: 'l2_review', payload: {} }), /missing payload\.contentId/);
  assert.throws(() => dispatchFor({ type: 'send_digest', payload: {} }), /Unknown job type: send_digest/);
});

test('env numbers fall back instead of degrading into a spin loop', () => {
  // `Number('')` is 0, not NaN — an empty JOB_POLL_INTERVAL_MS must not become
  // a zero-delay poll.
  assert.equal(numberFromEnv({ JOB_POLL_INTERVAL_MS: '' }, 'JOB_POLL_INTERVAL_MS', 5000), 5000);
  assert.equal(numberFromEnv({ JOB_POLL_INTERVAL_MS: '   ' }, 'JOB_POLL_INTERVAL_MS', 5000), 5000);
  assert.equal(numberFromEnv({}, 'JOB_POLL_INTERVAL_MS', 5000), 5000);
  assert.equal(numberFromEnv({ JOB_POLL_INTERVAL_MS: 'soon' }, 'JOB_POLL_INTERVAL_MS', 5000), 5000);
  assert.equal(numberFromEnv({ JOB_POLL_INTERVAL_MS: '-1' }, 'JOB_POLL_INTERVAL_MS', 5000), 5000);
});

test('env numbers accept the values operators actually set', () => {
  assert.equal(numberFromEnv({ JOB_POLL_INTERVAL_MS: '250' }, 'JOB_POLL_INTERVAL_MS', 5000), 250);
  // 0 is meaningful for JOB_MAX_ITERATIONS ("run until signalled"), so it must
  // survive rather than be treated as absent.
  assert.equal(numberFromEnv({ JOB_MAX_ITERATIONS: '0' }, 'JOB_MAX_ITERATIONS', 7), 0);
});
