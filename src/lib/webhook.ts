/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import dns from 'dns/promises';
import net from 'net';

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
    if (await isPrivateWebhookTarget(webhookUrl)) {
      return { skipped: true as const, reason: 'blocked_private_target' };
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

async function isPrivateWebhookTarget(url: URL) {
  const host = url.hostname.toLowerCase();
  if (isPrivateHost(host)) return true;
  if (net.isIP(host) !== 0) return isPrivateIp(host);

  const addresses = await dns.lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0) return true;
  if (addresses.some((address) => isPrivateIp(address.address))) return true;
  return false;
}

export function isPrivateHost(host: string) {
  return host === 'localhost' || host.endsWith('.localhost');
}

export function isPrivateIp(ip: string) {
  const normalizedIp = ip.toLowerCase();
  if (normalizedIp.startsWith('::ffff:')) return isPrivateIp(normalizedIp.slice(7));
  if (net.isIP(normalizedIp) === 4) {
    const [first = 0, second = 0] = normalizedIp.split('.').map(Number);
    if (first === 0 || first === 10 || first === 127) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 198 && (second === 18 || second === 19)) return true;
    if (first >= 224) return true;
    return false;
  }

  if (normalizedIp === '::1' || normalizedIp === '::') return true;
  if (normalizedIp.startsWith('fc') || normalizedIp.startsWith('fd')) return true;
  if (normalizedIp.startsWith('fe80:')) return true;
  return false;
}
