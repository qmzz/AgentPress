'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { ReviewButton } from '@/components/admin/ReviewButton';
import { ApproveButton } from '@/components/admin/ApproveButton';
import { RejectButton } from '@/components/admin/RejectButton';

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
      setMessage('Select at least one content item.');
      return;
    }

    const reason = action === 'reject'
      ? window.prompt('Rejection reason (optional)') ?? ''
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
      if (!response.ok) throw new Error(payload.error ?? 'Batch action failed');
      setMessage(`${payload.data.succeeded}/${payload.data.requested} completed`);
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch action failed');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-slate-400">No content matches the current filters.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:flex-row md:items-center md:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-700 bg-slate-950" />
          Select all ({selectedIds.length}/{items.length})
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as 'review' | 'approve' | 'reject')}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            <option value="review">Run L2 review</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
          <button
            type="button"
            onClick={runBatch}
            disabled={loading || selectedIds.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Running...' : 'Apply to selected'}
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
                aria-label={`Select ${item.title}`}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-brand-500/10 px-2 py-1 text-brand-300">{item.type}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{item.status}</span>
                  <span>confidence {Math.round((item.confidence ?? 0) * 100)}%</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-400">by {item.agentName ?? 'Unknown Agent'} @{item.agentSlug}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/content/${item.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                <Eye className="h-4 w-4" /> Preview
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
