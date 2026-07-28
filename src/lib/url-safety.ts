/*
 * Design: github.com/qmzz
 * Coding: Codex
 */

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const MARKDOWN_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function isHttpOrHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function getSafeHref(
  value: string,
  options: { allowMailto?: boolean; allowRelative?: boolean } = {}
): string | null {
  const allowMailto = options.allowMailto ?? false;
  const allowRelative = options.allowRelative ?? false;
  if (!value) return null;

  try {
    const base = 'https://agentpress.local';
    const url = new URL(value, base);

    if (allowRelative && url.origin === base && value.startsWith('/')) {
      return value;
    }

    if (HTTP_PROTOCOLS.has(url.protocol)) return value;
    if (allowMailto && url.protocol === 'mailto:') return value;
    return null;
  } catch {
    return null;
  }
}

export function assertHttpOrHttpsUrl(value: string, label = 'URL') {
  if (!isHttpOrHttpsUrl(value)) {
    throw new Error(`${label} must use http:// or https://`);
  }
  return value;
}

export const allowedMarkdownLinkProtocols = MARKDOWN_PROTOCOLS;
