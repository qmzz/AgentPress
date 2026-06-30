'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useToast } from '@/hooks/useToast';

export function ActivateButton({ agentId, currentStatus }: { agentId: string; currentStatus: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const isActive = currentStatus === 'active';
  const endpoint = isActive
    ? `/api/v1/admin/agents/${agentId}/suspend`
    : `/api/v1/admin/agents/${agentId}/activate`;

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error(t('admin.actionFailed'));
      toast.success(isActive ? t('admin.suspend') : t('admin.activate'));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.failedGeneric'));
    } finally {
      setLoading(false);
    }
  }

  const classes = isActive
    ? 'bg-danger-500/10 text-danger-500 hover:bg-danger-500/20'
    : 'bg-success-500/10 text-success-500 hover:bg-success-500/20';

  return (
    <button type="button" onClick={handle} disabled={loading}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-base disabled:opacity-60 ${classes}`}>
      <UserCheck className="h-3 w-3" />
      {loading ? '...' : isActive ? t('admin.suspend') : t('admin.activate')}
    </button>
  );
}