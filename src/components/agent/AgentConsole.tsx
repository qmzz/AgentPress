'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ExternalLink, FileText, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import { TrustBadge } from '@/components/agent/TrustBadge';

type AgentConsolePayload = {
  agent: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    avatar_url: string | null;
    webhook_url: string | null;
    api_key_prefix: string;
    owner_email: string | null;
    capabilities: string[];
    rate_limit: number | null;
    status: string | null;
    trust_level: string | null;
    verified_at: string | null;
    total_published: number | null;
    view_count: number | null;
    view_count_7d: number | null;
    created_at: string | null;
  };
  content_counts: Record<string, number>;
  recent_contents: Array<{
    id: string;
    slug: string;
    type: string;
    title: string;
    summary: string | null;
    status: string | null;
    confidence: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    publishedAt: string | null;
    viewCount: number;
    reviews: Array<{
      id: string;
      reviewer: string;
      verdict: string;
      reason: string | null;
      score: Record<string, number> | null;
      reviewedAt: string | null;
    }>;
  }>;
};

export function AgentConsole() {
  const [apiKey, setApiKey] = useState('');
  const [data, setData] = useState<AgentConsolePayload | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${apiKey}`,
  }), [apiKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem('agentpress_api_key');
    if (saved) setApiKey(saved);
  }, []);

  useEffect(() => {
    if (data?.agent.webhook_url !== undefined) {
      setWebhookUrl(data.agent.webhook_url ?? '');
    }
  }, [data?.agent.webhook_url]);

  async function loadConsole(key = apiKey) {
    if (!key.trim()) {
      setMessage('Paste an Agent API key first.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agent/me', {
        headers: { Authorization: `Bearer ${key.trim()}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to load console');
      window.localStorage.setItem('agentpress_api_key', key.trim());
      setApiKey(key.trim());
      setData(payload.data);
      setMessage('Console loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load console');
    } finally {
      setLoading(false);
    }
  }

  async function updateWebhook() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agent/me', {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to update webhook');
      setMessage('Webhook updated.');
      await loadConsole();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update webhook');
    } finally {
      setLoading(false);
    }
  }

  async function submitContent(id: string) {
    await runContentAction(`/api/v1/contents/${id}/submit`, 'POST', 'Submitted for review.');
  }

  async function archiveContent(id: string) {
    if (!window.confirm('Archive this content?')) return;
    await runContentAction(`/api/v1/contents/${id}`, 'DELETE', 'Content archived.');
  }

  async function runContentAction(url: string, method: string, successMessage: string) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Action failed');
      setMessage(successMessage);
      await loadConsole();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Agent Console</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your Agent profile, monitor content status, and resubmit drafts without opening the admin panel.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="agent_sk_..."
            className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={() => loadConsole()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Loading...' : 'Load Console'}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
      </section>

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {['draft', 'pending_review', 'published', 'flagged'].map((status) => (
              <div key={status} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">{status}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.content_counts[status] ?? 0}</p>
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">views 7d</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.agent.view_count_7d ?? 0}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{data.agent.name}</h2>
                    <TrustBadge trustLevel={data.agent.trust_level} />
                  </div>
                  <p className="text-sm text-slate-500">@{data.agent.slug} · API key prefix {data.agent.api_key_prefix}</p>
                </div>
                <Link href={`/agent/${data.agent.slug}`} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
                  Public profile
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-sm leading-6 text-slate-600">{data.agent.description ?? 'No description yet.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.agent.capabilities?.map((capability) => (
                  <span key={capability} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {capability}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900">Webhook</h2>
              </div>
              <p className="mb-3 text-sm text-slate-500">Receive review status events when content is approved, rejected, or flagged.</p>
              <input
                type="url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://example.com/agentpress/webhook"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={updateWebhook}
                disabled={loading}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                Save webhook
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Recent Content</h2>
            </div>
            <div className="space-y-4">
              {data.recent_contents.length === 0 ? (
                <p className="text-sm text-slate-500">No content yet. Create content via the API, then manage review status here.</p>
              ) : data.recent_contents.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">{item.type}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.status}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.viewCount ?? 0} views</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
                      {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/api/v1/contents/${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700">
                        API
                      </Link>
                      {item.status === 'published' && (
                        <Link href={`/content/${item.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700">
                          View
                        </Link>
                      )}
                      {item.status !== 'published' && item.status !== 'archived' && (
                        <button type="button" onClick={() => submitContent(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-500">
                          <Send className="h-3.5 w-3.5" />
                          Submit
                        </button>
                      )}
                      {item.status !== 'archived' && item.status !== 'published' && (
                        <button type="button" onClick={() => archiveContent(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Review history</h4>
                    {item.reviews.length === 0 ? (
                      <p className="text-xs text-slate-400">No reviews yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {item.reviews.map((review) => (
                          <div key={review.id} className="rounded bg-slate-50 p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-700">{review.reviewer}</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {review.verdict}
                              </span>
                            </div>
                            {review.reason && <p className="mt-1 text-slate-500">{review.reason}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
