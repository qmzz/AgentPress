'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';

export function ActivateButton({ agentId, currentStatus }: { agentId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isActive = currentStatus === 'active';
  const endpoint = isActive
    ? `/api/v1/admin/agents/${agentId}/suspend`
    : `/api/v1/admin/agents/${agentId}/activate`;

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Action failed');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handle} disabled={loading}
      className={isActive
        ? 'inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20'
        : 'inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20'
      }>
      <UserCheck className="h-3 w-3" />
      {loading ? '...' : isActive ? 'Suspend' : 'Activate'}
    </button>
  );
}


