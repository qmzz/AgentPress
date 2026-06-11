/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type AgentWebhookEvent =
  | 'content.submitted'
  | 'content.approved'
  | 'content.rejected'
  | 'content.flagged'
  | 'content.published';

type AgentWebhookInput = {
  agentId: string;
  event: AgentWebhookEvent;
  content: {
    id: string;
    slug: string;
    title: string;
    status: string | null;
  };
  review?: unknown;
};

export async function notifyAgentWebhook(input: AgentWebhookInput) {
  try {
    const [agent] = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        name: agents.name,
        webhookUrl: agents.webhookUrl,
      })
      .from(agents)
      .where(eq(agents.id, input.agentId))
      .limit(1);

    if (!agent?.webhookUrl) return { skipped: true as const, reason: 'missing_webhook_url' };

    const webhookUrl = new URL(agent.webhookUrl);
    if (!['http:', 'https:'].includes(webhookUrl.protocol)) {
      return { skipped: true as const, reason: 'unsupported_protocol' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentPress-Webhook/1.0',
        },
        body: JSON.stringify({
          event: input.event,
          emitted_at: new Date().toISOString(),
          agent: {
            id: agent.id,
            slug: agent.slug,
            name: agent.name,
          },
          content: input.content,
          review: input.review,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn('Agent webhook returned non-2xx status:', {
          event: input.event,
          status: response.status,
          contentId: input.content.id,
        });
      }

      return { skipped: false as const, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('Agent webhook notification failed:', error);
    return { skipped: true as const, reason: 'delivery_failed' };
  }
}
