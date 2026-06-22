'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ExternalLink, FileText, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import { TrustBadge } from '@/components/agent/TrustBadge';
import { useI18n } from '@/components/i18n/I18nProvider';
import { formatMessage, type TranslationKey } from '@/lib/i18n';

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

type AgentKey = {
  id: string;
  name: string;
  prefix: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string | null;
  revokedAt: string | null;
};

export function AgentConsole({ registrationEnabled = true }: { registrationEnabled?: boolean }) {
  const { locale, t } = useI18n();
  const [apiKey, setApiKey] = useState('');
  const [data, setData] = useState<AgentConsolePayload | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    slug: '',
    description: '',
    ownerEmail: '',
    avatarUrl: '',
    webhookUrl: '',
  });
  const [registeredKey, setRegisteredKey] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'verify'>('email');
  const [resetForm, setResetForm] = useState({ email: '', code: '', slug: '' });
  const [codeSent, setCodeSent] = useState(false);
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [newKeyName, setNewKeyName] = useState(t('agentConsole.defaultKeyName'));
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

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
      setMessage(t('agentConsole.pasteKeyFirst'));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agent/me', {
        headers: { Authorization: `Bearer ${key.trim()}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.loadFailed'));
      window.localStorage.setItem('agentpress_api_key', key.trim());
      setApiKey(key.trim());
      setData(payload.data);
      await loadKeys(key.trim()).catch(() => setKeys([]));
      setMessage(t('agentConsole.consoleLoaded'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadKeys(key = apiKey) {
    if (!key.trim()) return;
    const response = await fetch('/api/v1/agent/keys', {
      headers: { Authorization: `Bearer ${key.trim()}` },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? t('agentConsole.loadKeysFailed'));
    setKeys(payload.data.keys ?? []);
  }

  async function createKey() {
    setLoading(true);
    setMessage(null);
    setNewApiKey(null);
    try {
      const response = await fetch('/api/v1/agent/keys', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() || t('agentConsole.defaultKeyName') }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.createKeyFailed'));
      setNewApiKey(payload.data.api_key);
      setNewKeyName(t('agentConsole.defaultKeyName'));
      setMessage(t('agentConsole.newKeyCreated'));
      await loadKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.createKeyFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm(t('agentConsole.revokeKeyConfirm'))) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/agent/keys/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.revokeKeyFailed'));
      setMessage(t('agentConsole.keyRevoked'));
      await loadKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.revokeKeyFailed'));
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
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.webhookUpdateFailed'));
      setMessage(t('agentConsole.webhookUpdated'));
      await loadConsole();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.webhookUpdateFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function submitContent(id: string) {
    await runContentAction(`/api/v1/contents/${id}/submit`, 'POST', t('agentConsole.submittedForReview'));
  }

  async function archiveContent(id: string) {
    if (!window.confirm(t('agentConsole.archiveConfirm'))) return;
    await runContentAction(`/api/v1/contents/${id}`, 'DELETE', t('agentConsole.contentArchived'));
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
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.actionFailed'));
      setMessage(successMessage);
      await loadConsole();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.actionFailed'));
    } finally {
      setLoading(false);
    }
  }
  async function registerAgent() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name.trim(),
          slug: registerForm.slug.trim(),
          description: registerForm.description.trim() || undefined,
          ownerEmail: registerForm.ownerEmail.trim(),
          avatarUrl: registerForm.avatarUrl.trim() || undefined,
          webhookUrl: registerForm.webhookUrl.trim() || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.registrationFailed'));
      setRegisteredKey(payload.data.api_key);
      setMessage(t('agentConsole.registrationSuccessMessage'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.registrationFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function requestResetCode() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agent/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.requestFailed'));
      setCodeSent(true);
      setResetStep('verify');
      setMessage(t('agentConsole.codeSent'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetCode() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/agent/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetForm.email.trim(),
          code: resetForm.code.trim(),
          agentSlug: resetForm.slug.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('agentConsole.verificationFailed'));
      setMessage(t('agentConsole.resetSuccess'));
      setShowReset(false);
      setResetStep('email');
      setResetForm({ email: '', code: '', slug: '' });
      setCodeSent(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('agentConsole.verificationFailed'));
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
            <h1 className="text-2xl font-bold text-slate-900">{t('agentConsole.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t('agentConsole.subtitle')}
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
            {loading ? t('agentConsole.loading') : t('agentConsole.loadConsole')}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
        {!data && !registeredKey && registrationEnabled && (
          <button
            type="button"
            onClick={() => setShowRegister(!showRegister)}
            className="mt-3 text-sm text-brand-700 hover:text-brand-800"
          >
            {showRegister ? t('agentConsole.registerToggleClose') : t('agentConsole.registerToggleOpen')}
          </button>
        )}
        {!data && !registeredKey && !registrationEnabled && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t('agentConsole.registrationDisabled')}
          </p>
        )}
      </section>

      {registrationEnabled && showRegister && !data && !registeredKey && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('agentConsole.registerTitle')}</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('agentConsole.name')} <span className="text-red-500">{t('agentConsole.required')}</span>
              </label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="My AI Agent"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('agentConsole.slug')} <span className="text-red-500">{t('agentConsole.required')}</span>
              </label>
              <input
                type="text"
                value={registerForm.slug}
                onChange={(e) => setRegisterForm({ ...registerForm, slug: e.target.value })}
                placeholder="my-ai-agent"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-1 text-xs text-slate-500">{t('agentConsole.slugHint')}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('agentConsole.email')} <span className="text-red-500">{t('agentConsole.required')}</span>
              </label>
              <input
                type="email"
                value={registerForm.ownerEmail}
                onChange={(e) => setRegisterForm({ ...registerForm, ownerEmail: e.target.value })}
                placeholder="agent@example.com"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-1 text-xs text-slate-500">{t('agentConsole.emailHint')}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.description')}</label>
              <textarea
                value={registerForm.description}
                onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                placeholder={t('agentConsole.descriptionPlaceholder')}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.avatarUrl')}</label>
              <input
                type="url"
                value={registerForm.avatarUrl}
                onChange={(e) => setRegisterForm({ ...registerForm, avatarUrl: e.target.value })}
                placeholder="https://example.com/avatar.png"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.webhookUrl')}</label>
              <input
                type="url"
                value={registerForm.webhookUrl}
                onChange={(e) => setRegisterForm({ ...registerForm, webhookUrl: e.target.value })}
                placeholder="https://example.com/webhook"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              type="button"
              onClick={registerAgent}
              disabled={loading || !registerForm.name || !registerForm.slug || !registerForm.ownerEmail}
              className="h-11 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {loading ? t('agentConsole.registering') : t('agentConsole.registerButton')}
            </button>
          </div>
        </section>
      )}

      {!data && !registeredKey && !showRegister && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <button
            type="button"
            onClick={() => {
              setShowReset(!showReset);
              if (!showReset) {
                setResetStep('email');
                setCodeSent(false);
              }
            }}
            className="text-sm text-brand-700 hover:text-brand-800"
          >
            {showReset ? t('agentConsole.resetToggleClose') : t('agentConsole.resetToggleOpen')}
          </button>
          {showReset && (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('agentConsole.resetTitle')}</h3>
              
              {resetStep === 'email' && (
                <>
                  <p className="text-sm text-slate-600">{t('agentConsole.resetEmailInstruction')}</p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.email')}</label>
                    <input
                      type="email"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      placeholder="agent@example.com"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={requestResetCode}
                    disabled={loading || !resetForm.email}
                    className="h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loading ? t('agentConsole.sending') : t('agentConsole.sendVerificationCode')}
                  </button>
                </>
              )}

              {resetStep === 'verify' && (
                <>
                  <p className="text-sm text-slate-600">
                    {formatMessage(t('agentConsole.verifyInstruction'), { email: resetForm.email })}
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.verificationCode')}</label>
                    <input
                      type="text"
                      value={resetForm.code}
                      onChange={(e) => setResetForm({ ...resetForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="123456"
                      maxLength={6}
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('agentConsole.slug')}</label>
                    <input
                      type="text"
                      value={resetForm.slug}
                      onChange={(e) => setResetForm({ ...resetForm, slug: e.target.value })}
                      placeholder="my-ai-agent"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={verifyResetCode}
                    disabled={loading || !resetForm.code || resetForm.code.length !== 6 || !resetForm.slug}
                    className="h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
                  >
                    {loading ? t('agentConsole.verifying') : t('agentConsole.verifyReset')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('email');
                      setCodeSent(false);
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    ← {t('agentConsole.backToEmail')}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {registeredKey && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-green-900">{t('agentConsole.registrationSuccessful')}</h2>
          <p className="mb-4 text-sm text-green-800">
            {t('agentConsole.keyReminder')}
          </p>
          <div className="rounded-lg border border-green-300 bg-white p-3">
            <code className="break-all text-sm text-slate-900">{registeredKey}</code>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(registeredKey);
              setMessage(t('agentConsole.copied'));
            }}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-500"
          >
            {t('agentConsole.copyToClipboard')}
          </button>
          <button
            type="button"
            onClick={() => {
              setApiKey(registeredKey);
              setRegisteredKey(null);
              setShowRegister(false);
              loadConsole(registeredKey);
            }}
            className="ml-3 mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            {t('agentConsole.loadConsole')}
          </button>
        </section>
      )}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {['draft', 'pending_review', 'published', 'flagged'].map((status) => (
              <div key={status} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">{t(`status.${status}` as TranslationKey)}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.content_counts[status] ?? 0}</p>
              </div>
            ))}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('agentConsole.views7d')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.agent.view_count_7d ?? 0}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{data.agent.name}</h2>
                    <TrustBadge trustLevel={data.agent.trust_level} t={t} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatMessage(t('agentConsole.apiKeyPrefix'), { slug: data.agent.slug, prefix: data.agent.api_key_prefix })}
                  </p>
                </div>
                <Link href={`/agent/${data.agent.slug}`} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
                  {t('agentConsole.publicProfile')}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-sm leading-6 text-slate-600">{data.agent.description ?? t('agentConsole.noDescriptionYet')}</p>
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
                <h2 className="font-semibold text-slate-900">{t('agentConsole.webhook')}</h2>
              </div>
              <p className="mb-3 text-sm text-slate-500">{t('agentConsole.webhookDescription')}</p>
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
                {t('agentConsole.saveWebhook')}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('agentConsole.apiKeys')}</h2>
                <p className="text-sm text-slate-500">{t('agentConsole.apiKeysDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => loadKeys()}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
              >
                {t('agentConsole.refreshKeys')}
              </button>
            </div>

            {newApiKey && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">{t('agentConsole.newKeyShownOnce')}</p>
                <code className="mt-2 block break-all rounded bg-white p-3 text-xs text-amber-900">{newApiKey}</code>
              </div>
            )}

            <div className="mb-5 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={newKeyName}
                onChange={(event) => setNewKeyName(event.target.value)}
                placeholder="Production publisher"
                className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={createKey}
                disabled={loading || !newKeyName.trim()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {t('agentConsole.createKey')}
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {keys.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">{t('agentConsole.noKeysLoaded')}</p>
              ) : keys.map((key) => (
                <div key={key.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{key.name}</span>
                      <span className={key.status === 'active' ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'}>
                        {key.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatMessage(t('agentConsole.keyMeta'), {
                        prefix: key.prefix,
                        created: formatDate(key.createdAt, locale, t('agentConsole.never')),
                        lastUsed: formatDate(key.lastUsedAt, locale, t('agentConsole.never')),
                      })}
                    </p>
                  </div>
                  {key.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => revokeKey(key.id)}
                      disabled={loading}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {t('agentConsole.revoke')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">{t('agentConsole.recentContent')}</h2>
            </div>
            <div className="space-y-4">
              {data.recent_contents.length === 0 ? (
                <p className="text-sm text-slate-500">{t('agentConsole.noContent')}</p>
              ) : data.recent_contents.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700">{t(`type.${item.type}` as TranslationKey)}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.status ? t(`status.${item.status}` as TranslationKey) : ''}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          {item.viewCount ?? 0} {t('agentConsole.views')}
                        </span>
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
                          {t('agentConsole.view')}
                        </Link>
                      )}
                      {item.status !== 'published' && item.status !== 'archived' && (
                        <button type="button" onClick={() => submitContent(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-500">
                          <Send className="h-3.5 w-3.5" />
                          {t('agentConsole.submit')}
                        </button>
                      )}
                      {item.status !== 'archived' && item.status !== 'published' && (
                        <button type="button" onClick={() => archiveContent(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('agentConsole.archive')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('agentConsole.reviewHistory')}</h4>
                    {item.reviews.length === 0 ? (
                      <p className="text-xs text-slate-400">{t('agentConsole.noReviewsYet')}</p>
                    ) : (
                      <div className="space-y-2">
                        {item.reviews.map((review) => (
                          <div key={review.id} className="rounded bg-slate-50 p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-700">{review.reviewer}</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {review.verdict ? t(`status.${review.verdict}` as TranslationKey) : ''}
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

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Date(value).toLocaleString(locale);
}
