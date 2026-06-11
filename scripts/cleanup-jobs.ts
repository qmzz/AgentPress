/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { cleanupOldJobs } from '../src/lib/job-queue';

const daysToKeep = parseInt(process.env.JOB_RETENTION_DAYS ?? '7', 10);

async function main() {
  console.log(`Cleaning up jobs older than ${daysToKeep} days...`);
  await cleanupOldJobs(daysToKeep);
  console.log('Job cleanup complete');
}

main().catch(console.error);
