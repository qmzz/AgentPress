'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';

export function TrustLevelSelect({ agentId, trustLevel }: { agentId: string; trustLevel?: string | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function updateTrust(nextTrustLevel: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/agents/${agentId}/trust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustLevel: nextTrustLevel }),
      });
      if (!response.ok) throw new Error(t('admin.trustUpdateFailed'));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : t('admin.trustUpdateFailed'));
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
      <option value="standard">{t('admin.standard')}</option>
      <option value="trusted">{t('admin.trusted')}</option>
      <option value="verified">{t('admin.verified')}</option>
    </select>
  );
}
