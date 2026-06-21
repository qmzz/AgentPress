'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2 } from 'lucide-react';

export function ReviewButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runReview() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/contents/${contentId}/review`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? '审核失败');
      setMessage(`L2: ${payload.data.verdict}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '审核失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={runReview}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Wand2 className="h-4 w-4" />
        {loading ? '审核中...' : '运行 L2 审核'}
      </button>
      {message && <span className="text-xs text-slate-400">{message}</span>}
    </div>
  );
}


