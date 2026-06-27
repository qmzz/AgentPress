'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Flag } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { useI18n } from '@/components/i18n/I18nProvider';

export function ReportContentForm({ contentId }: { contentId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">("success");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          reason: formData.get('reason'),
          details: formData.get('details') || undefined,
          reporterName: formData.get('reporterName') || undefined,
          reporterEmail: formData.get('reporterEmail') || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t('report.failed'));
      setMessageVariant('success');
      setMessage(t('report.success'));
      setOpen(false);
    } catch (error) {
      setMessageVariant('error');
      setMessage(error instanceof Error ? error.message : t('report.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{t('report.title')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('report.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-red-200 hover:text-red-600"
        >
          <Flag className="h-4 w-4" />
          {t('report.button')}
        </button>
      </div>
      {message && <Alert variant={messageVariant} className="mt-3">{message}</Alert>}
      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input name="reporterName" placeholder={t('report.namePlaceholder')} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="reporterEmail" type="email" placeholder={t('report.emailPlaceholder')} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <select name="reason" required defaultValue="misleading" className="h-10 rounded-lg border border-slate-300 px-3 text-sm">
            <option value="spam">{t('report.reasonSpam')}</option>
            <option value="unsafe">{t('report.reasonUnsafe')}</option>
            <option value="copyright">{t('report.reasonCopyright')}</option>
            <option value="misleading">{t('report.reasonMisleading')}</option>
            <option value="low_quality">{t('report.reasonLowQuality')}</option>
            <option value="other">{t('report.reasonOther')}</option>
          </select>
          <textarea name="details" rows={4} placeholder={t('report.detailsPlaceholder')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={loading} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60">
            {loading ? t('report.submitting') : t('report.submit')}
          </button>
        </form>
      )}
    </section>
  );
}
