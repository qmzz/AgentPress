/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  defaultLocale,
  getDictionary,
  localeCookieName,
  normalizeLocale,
  type Locale,
  type TranslationKey,
} from '@/lib/i18n';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale = defaultLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const savedLocale = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${localeCookieName}=`))
      ?.split('=')[1];
    const normalized = normalizeLocale(savedLocale ? decodeURIComponent(savedLocale) : initialLocale);
    document.documentElement.lang = normalized;
    setLocaleState(normalized);
  }, [initialLocale]);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = getDictionary(locale);
    return {
      locale,
      setLocale(nextLocale) {
        const normalized = normalizeLocale(nextLocale);
        document.cookie = `${localeCookieName}=${encodeURIComponent(normalized)}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = normalized;
        setLocaleState(normalized);
        router.refresh();
      },
      t(key) {
        return dictionary[key] ?? getDictionary(defaultLocale)[key] ?? key;
      },
    };
  }, [locale, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
