/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { cookies } from 'next/headers';
import { getDictionary, localeCookieName, normalizeLocale, type TranslationKey } from '@/lib/i18n';

export function getServerI18n() {
  const locale = normalizeLocale(cookies().get(localeCookieName)?.value);
  const dictionary = getDictionary(locale);

  return {
    locale,
    t(key: TranslationKey) {
      return dictionary[key] ?? getDictionary('en')[key] ?? key;
    },
  };
}
