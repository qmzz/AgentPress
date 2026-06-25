'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Inbox, LayoutDashboard } from 'lucide-react';
import { ReviewButton } from '@/components/admin/ReviewButton';
import { ApproveButton } from '@/components/admin/ApproveButton';
import { RejectButton } from '@/components/admin/RejectButton';
import { useI18n } from '@/components/i18n/I18nProvider';
import { formatMessage, type TranslationKey } from '@/lib/i18n';
import { EmptyState } from '@/components/ui/EmptyState';

type QueueItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string | null;
  confidence: number | null;
  agentName: string | null;
  agentSlug: string | null;
};

export function ContentReviewQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<'review' | 'approve' | 'reject'>('review');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  function toggleItem(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  async function runBatch() {
    if (selectedIds.length === 0) {
      setMessage(t('admin.selectAtLeastOne'));
      return;
    }

    const reason = action === 'reject'
      ? window.prompt(t('admin.rejectionReason')) ?? ''
      : undefined;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/admin/contents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('admin.batchFailed'));
      setMessage(formatMessage(t('admin.batchCompleted'), {
        succeeded: payload.data.succeeded,
        requested: payload.data.requested,
      }));
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('admin.batchFailed'));
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={t('admin.noContentMatches')}
        className="border-slate-800 bg-slate-900/50 [&_h2]:text-white [&_p]:text-slate-400"
        actions={
          <>
            <Link
              href="/admin/contents"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
            >
              <Eye className="h-4 w-4" />
              {t('admin.viewAll')}
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              {t('admin.dashboard')}
            </Link>
          </>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-700 bg-slate-950" />
          {formatMessage(t('admin.selectAllCount'), { selected: selectedIds.length, total: items.length })}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as 'review' | 'approve' | 'reject')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            <option value="review">{t('admin.runL2Review')}</option>
            <option value="approve">{t('admin.approve')}</option>
            <option value="reject">{t('admin.reject')}</option>
          </select>
          <button
            type="button"
            onClick={runBatch}
            disabled={loading || selectedIds.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('admin.runningAction') : t('admin.applyToSelected')}
          </button>
        </div>
        {message && <p className="text-sm text-slate-400">{message}</p>}
      </div>

      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={selectedSet.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950"
                aria-label={formatMessage(t('admin.selectItem'), { title: item.title })}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-brand-500/10 px-2 py-1 text-brand-300">{t(`type.${item.type}` as TranslationKey)}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{item.status ? t(`status.${item.status}` as TranslationKey) : ''}</span>
                  <span>{t('admin.confidence')} {Math.round((item.confidence ?? 0) * 100)}%</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {formatMessage(t('admin.byAgent'), {
                    agentName: item.agentName ?? t('admin.unknownAgent'),
                    agentSlug: item.agentSlug ?? 'unknown',
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/contents/${item.id}/preview`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                <Eye className="h-4 w-4" /> {t('admin.preview')}
              </Link>
              <ReviewButton contentId={item.id} />
              <ApproveButton contentId={item.id} />
              <RejectButton contentId={item.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


