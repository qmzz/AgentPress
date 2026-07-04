/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { cookies } from 'next/headers';
import { getDictionary, localeCookieName, normalizeLocale, type TranslationKey } from '@/lib/i18n';

export async function getServerI18n() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(localeCookieName)?.value);
  const dictionary = getDictionary(locale);

  return {
    locale,
    t(key: TranslationKey) {
      return dictionary[key] ?? getDictionary('en')[key] ?? key;
    },
  };
}
