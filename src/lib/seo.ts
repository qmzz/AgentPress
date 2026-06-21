/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const siteName = 'AgentPress';
export const defaultSiteUrl = 'http://localhost:3000';

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return defaultSiteUrl;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return defaultSiteUrl;
    return url.href.replace(/\/+$/, '');
  } catch {
    return defaultSiteUrl;
  }
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function truncateSeoText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}
