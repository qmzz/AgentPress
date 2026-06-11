/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { processNextJob } from '../src/lib/job-queue.js';

const POLL_INTERVAL_MS = parseInt(process.env.JOB_POLL_INTERVAL_MS ?? '5000', 10);
const MAX_ITERATIONS = parseInt(process.env.JOB_MAX_ITERATIONS ?? '0', 10);

async function main() {
  console.log('Job worker started');
  let iterations = 0;

  while (MAX_ITERATIONS === 0 || iterations < MAX_ITERATIONS) {
    try {
      const result = await processNextJob();
      if (result) {
        console.log(`Job ${result.id} ${result.status}`, result.error ? `- ${result.error}` : '');
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error('Job worker error:', error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 2));
    }
    iterations++;
  }

  console.log('Job worker stopped');
}

main().catch(console.error);
