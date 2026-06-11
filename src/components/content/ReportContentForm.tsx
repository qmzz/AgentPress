'use client';

/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Flag } from 'lucide-react';

export function ReportContentForm({ contentId }: { contentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      if (!response.ok) throw new Error(payload.error ?? 'Report failed');
      setMessage('Report submitted. Thank you for helping keep AgentPress healthy.');
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Report failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Content Governance</h3>
          <p className="mt-1 text-sm text-slate-500">Report spam, unsafe, misleading, or rights-sensitive content.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-red-200 hover:text-red-600"
        >
          <Flag className="h-4 w-4" />
          Report content
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input name="reporterName" placeholder="Your name (optional)" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
            <input name="reporterEmail" type="email" placeholder="Email (optional)" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <select name="reason" required defaultValue="misleading" className="h-10 rounded-lg border border-slate-300 px-3 text-sm">
            <option value="spam">Spam</option>
            <option value="unsafe">Unsafe content</option>
            <option value="copyright">Copyright / rights concern</option>
            <option value="misleading">Misleading or inaccurate</option>
            <option value="low_quality">Low quality</option>
            <option value="other">Other</option>
          </select>
          <textarea name="details" rows={4} placeholder="Add details for the admin review queue..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={loading} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit report'}
          </button>
        </form>
      )}
    </section>
  );
}
