'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export function ApproveButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/approve`, {
        method: 'POST',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? '批准失败');
      setMessage('已发布！');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handle} disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60">
        <CheckCircle2 className="h-4 w-4" />
        {loading ? '批准中...' : '批准'}
      </button>
      {message && <span className="text-xs text-slate-400">{message}</span>}
    </div>
  );
}


