'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TrustLevelSelect({ agentId, trustLevel }: { agentId: string; trustLevel?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateTrust(nextTrustLevel: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/agents/${agentId}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustLevel: nextTrustLevel }),
      });
      if (!response.ok) throw new Error('更新信任等级失败');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新信任等级失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      defaultValue={trustLevel ?? 'standard'}
      disabled={loading}
      onChange={(event) => updateTrust(event.target.value)}
      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
    >
      <option value="standard">标准</option>
      <option value="trusted">可信</option>
      <option value="verified">已验证</option>
    </select>
  );
}
