/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { Metadata } from 'next';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AgentPress',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AgentPress',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
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
        <I18nProvider initialLocale={defaultLocale}>
          <ToastProvider />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

