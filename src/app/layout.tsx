/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { Metadata } from 'next';
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
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

