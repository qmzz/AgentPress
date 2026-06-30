'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useToast } from '@/hooks/useToast';

export function RejectButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handle() {
    const reason = window.prompt(t('admin.rejectionReason')) ?? '';
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? t('admin.rejectFailed'));
      toast.success(t('admin.flaggedDone'));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.failedGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-danger-600 px-3 py-2 text-sm text-white transition-base hover:bg-danger-500 disabled:opacity-60"
    >
      <XCircle className="h-4 w-4" />
      {loading ? t('admin.rejecting') : t('admin.reject')}
    </button>
  );
}
