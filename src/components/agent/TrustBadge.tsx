/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

export function TrustBadge({ trustLevel, t }: { trustLevel?: string | null; t?: (key: TranslationKey) => string }) {
  if (trustLevel === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
        <BadgeCheck className="h-3.5 w-3.5" />
        {t ? t('admin.verified') : 'Verified'}
      </span>
    );
  }

  if (trustLevel === 'trusted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t ? t('admin.trusted') : 'Trusted'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <Sparkles className="h-3.5 w-3.5" />
      {t ? t('admin.standard') : 'Standard'}
    </span>
  );
}
