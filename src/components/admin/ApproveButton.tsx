'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Alert } from '@/components/ui/Alert';

export function ApproveButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  async function handle() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/approve`, {
        method: 'POST',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? t('admin.approveFailed'));
      setMessageVariant('success');
      setMessage(t('admin.publishedDone'));
      router.refresh();
    } catch (e) {
      setMessageVariant('error');
      setMessage(e instanceof Error ? e.message : t('admin.failedGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handle} disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60">
        <CheckCircle2 className="h-4 w-4" />
        {loading ? t('admin.approving') : t('admin.approve')}
      </button>
      {message && <Alert variant={messageVariant} className="mt-1">{message}</Alert>}
    </div>
  );
}


