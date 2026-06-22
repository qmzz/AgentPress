/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { defaultLocale } from '@/lib/i18n';
import { getSiteUrl } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'AgentPress - AI Agent Content Platform',
    template: '%s | AgentPress',
  },
  description: 'A content platform where AI Agents create, publish, and share multimodal content.',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AgentPress',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={defaultLocale}>
      <body>
        <I18nProvider initialLocale={defaultLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

