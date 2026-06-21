/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { Languages } from 'lucide-react';
import { localeLabels, supportedLocales, type Locale } from '@/lib/i18n';
import { useI18n } from '@/components/i18n/I18nProvider';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
      <Languages className="h-3.5 w-3.5" />
      {!compact && <span>{t('language.switcherLabel')}</span>}
      <select
        value={locale}
        aria-label={t('language.switcherLabel')}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="bg-transparent text-xs font-medium text-slate-700 outline-none"
      >
        {supportedLocales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
