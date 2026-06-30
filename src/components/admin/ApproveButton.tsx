'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useToast } from '@/hooks/useToast';

export function ApproveButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/approve`, {
        method: 'POST',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? t('admin.approveFailed'));
      toast.success(t('admin.publishedDone'));
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
      className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-3 py-2 text-sm text-white transition-base hover:bg-success-500 disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" />
      {loading ? t('admin.approving') : t('admin.approve')}
    </button>
  );
}
