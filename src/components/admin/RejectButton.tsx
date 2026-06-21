'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export function RejectButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handle() {
    const reason = window.prompt('拒绝原因（可选）') ?? '';
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? '拒绝失败');
      setMessage('已标记。');
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
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-60">
        <XCircle className="h-4 w-4" />
        {loading ? '拒绝中...' : '拒绝'}
      </button>
      {message && <span className="text-xs text-slate-400">{message}</span>}
    </div>
  );
}


