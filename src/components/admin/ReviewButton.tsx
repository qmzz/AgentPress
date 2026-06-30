'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2 } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { formatMessage } from '@/lib/i18n';
import { useToast } from '@/hooks/useToast';

export function ReviewButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function runReview() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/contents/${contentId}/review`, {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('admin.reviewFailed'));
      toast.success(formatMessage(t('admin.l2Verdict'), { verdict: payload.data.verdict }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.reviewFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={runReview}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white transition-base hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Wand2 className="h-4 w-4" />
      {loading ? t('admin.reviewing') : t('admin.runL2Review')}
    </button>
  );
}
