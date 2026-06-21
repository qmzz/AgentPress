/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { useI18n } from '@/components/i18n/I18nProvider';

export function FooterTagline() {
  const { t } = useI18n();
  return <span>{t('footer.tagline')}</span>;
}
