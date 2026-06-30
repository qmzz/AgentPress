'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useToast } from '@/hooks/useToast';

type ReportAction = 'reviewing' | 'resolved' | 'dismissed';

const actionStyles: Record<ReportAction, string> = {
  reviewing: 'bg-brand-600 hover:bg-brand-500 text-white',
  resolved: 'bg-success-600 hover:bg-success-500 text-white',
  dismissed: 'bg-warning-600 hover:bg-warning-500 text-white',
};

export function ReportActionButton({
  reportId,
  status,
  flagContent = false,
  label,
}: {
  reportId: string;
  status: ReportAction;
  flagContent?: boolean;
  label: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, flagContent }),
      });
      if (!response.ok) throw new Error(t('admin.actionFailed'));
      toast.success(label);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.actionFailed'));
    } finally {
      setLoading(false);
    }
  }

  const style = flagContent ? 'bg-danger-600 hover:bg-danger-500 text-white' : actionStyles[status];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-base disabled:opacity-60 ${style}`}
    >
      {loading ? '...' : label}
    </button>
  );
}