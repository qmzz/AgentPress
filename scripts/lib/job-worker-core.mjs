/**
 * Pure decision logic for the job worker.
 *
 * Split out from `scripts/job-worker.mjs` because that file is a script: it
 * opens a database connection and starts polling at import time, so nothing in
 * it is reachable from a test. The parts where a bug would be silent — how a
 * failed attempt is classified, what a job type dispatches to, how env numbers
 * are parsed — live here instead, side-effect free.
 */

/**
 * Parse a non-negative number from the environment, falling back when the value
 * is absent, empty, non-numeric, or negative.
 *
 * `Number('')` is 0, not NaN, so an empty variable has to be rejected
 * explicitly or `JOB_POLL_INTERVAL_MS=` becomes a zero-delay spin loop.
 */
export function numberFromEnv(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Decide what a failed attempt does to the row.
 *
 * `attempts` is the value *after* the claim incremented it, so it is the number
 * of attempts made including the one that just failed. A job retires once that
 * reaches `max_attempts`; anything less goes back to the queue.
 */
export function failureOutcome(job) {
  const attempts = Number(job.attempts) || 0;
  const maxAttempts = Number(job.max_attempts) || 0;
  const exhausted = attempts >= maxAttempts;
  return { status: exhausted ? 'failed' : 'pending', exhausted, attempts, maxAttempts };
}

/**
 * Map a job to the admin endpoint that performs it.
 *
 * Dispatching over HTTP rather than importing the handler keeps one
 * implementation of each action, and makes queued runs land in
 * `admin_audit_log` the same way a manual admin click does.
 */
export function dispatchFor(job) {
  switch (job.type) {
    case 'l2_review': {
      const contentId = job.payload?.contentId;
      if (!contentId) throw new Error('l2_review job is missing payload.contentId');
      if (!UUID_PATTERN.test(String(contentId))) {
        throw new Error(`l2_review job has a malformed payload.contentId: ${contentId}`);
      }
      return { method: 'POST', path: `/api/v1/admin/contents/${contentId}/review` };
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * A job id is interpolated into a request path, so it is validated rather than
 * trusted: `payload` is written by application code today, but a job row is
 * data, and a path-traversing value must not become a request to some other
 * endpoint.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { UUID_PATTERN };
