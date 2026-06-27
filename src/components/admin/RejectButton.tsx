'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Alert } from '@/components/ui/Alert';

export function RejectButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  async function handle() {
    const reason = window.prompt(t('admin.rejectionReason')) ?? '';
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/contents/${contentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? t('admin.rejectFailed'));
      setMessageVariant('success');
      setMessage(t('admin.flaggedDone'));
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
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-60">
        <XCircle className="h-4 w-4" />
        {loading ? t('admin.rejecting') : t('admin.reject')}
      </button>
      {message && <Alert variant={messageVariant} className="mt-1">{message}</Alert>}
    </div>
  );
}


