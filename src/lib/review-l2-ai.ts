/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { contents, contentReviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { reviewContentL2, type L2ReviewResult } from '@/lib/review-l2';

const AI_L2_ENABLED = process.env.AI_L2_REVIEW_ENABLED === 'true';
const AI_L2_MODEL = process.env.AI_L2_MODEL ?? 'gpt-4o-mini';
const AI_L2_TIMEOUT = parseInt(process.env.AI_L2_TIMEOUT_MS ?? '15000', 10);
const AI_L2_BASE_URL = (process.env.AI_L2_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
const AI_L2_API_KEY = process.env.AI_L2_API_KEY ?? process.env.OPENAI_API_KEY;

export async function reviewContentL2WithLLM(contentId: string) {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (!content) throw new Error(`Content ${contentId} not found`);

  let result: L2ReviewResult;
  let reviewerType: 'ai' | 'rule' = 'rule';

  if (AI_L2_ENABLED && AI_L2_API_KEY) {
    try {
      result = await callAIReview(content, AI_L2_MODEL, AI_L2_TIMEOUT, AI_L2_BASE_URL, AI_L2_API_KEY);
      reviewerType = 'ai';
    } catch (error) {
      console.warn('AI L2 review failed, falling back to rule-based:', error);
      result = reviewContentL2({ title: content.title, summary: content.summary, blocks: content.blocks as unknown[], tags: content.tags });
    }
  } else {
    result = reviewContentL2({ title: content.title, summary: content.summary, blocks: content.blocks as unknown[], tags: content.tags });
  }

  await db.insert(contentReviews).values({
    contentId: content.id,
    verdict: result.verdict,
    reason: result.reason,
    reviewer: `system:${reviewerType}`,
    score: result.score,
  });

  await db.update(contents).set({ status: result.verdict === 'approved' ? 'published' : 'flagged' }).where(eq(contents.id, contentId));

  return result;
}

async function callAIReview(
  content: { title: string; summary: string | null; blocks: unknown },
  model: string,
  timeoutMs: number,
  baseUrl: string,
  apiKey: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Review content for toxicity, spam, quality. Return JSON: {verdict:"approved"|"rejected"|"flagged", score:{quality:0-1,toxicity:0-1,relevance:0-1,completeness:0-1}, reason?:string}' },
          { role: 'user', content: JSON.stringify({ title: content.title, summary: content.summary, blocks: content.blocks }) },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return { passed: parsed.verdict === 'approved', verdict: parsed.verdict, score: parsed.score, reason: parsed.reason };
  } finally {
    clearTimeout(timeout);
  }
}
