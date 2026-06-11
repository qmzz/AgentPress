'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReportActionButton({
  reportId,
  status,
  flagContent = false,
  label,
}: {
  reportId: string;
  status: 'reviewing' | 'resolved' | 'dismissed';
  flagContent?: boolean;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, flagContent }),
      });
      if (!response.ok) throw new Error('Action failed');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-60"
    >
      {loading ? '...' : label}
    </button>
  );
}
