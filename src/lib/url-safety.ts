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

  // Relative values only parse against a base, so they are classified before
  // the protocol checks. Resolving them first made every relative path inherit
  // the base's https: protocol and pass as absolute, ignoring allowRelative.
  const absolute = parseAbsoluteUrl(value);
  if (!absolute) {
    return allowRelative && isSameOriginPath(value) ? value : null;
  }

  if (HTTP_PROTOCOLS.has(absolute.protocol)) return value;
  if (allowMailto && absolute.protocol === 'mailto:') return value;
  return null;
}

function parseAbsoluteUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * A leading slash alone does not make a path local: `//host` is scheme-relative
 * and `/\host` normalizes the backslash to a slash, so both navigate off-site.
 * Resolution against a sentinel origin is what decides it.
 */
function isSameOriginPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  const base = 'https://agentpress.local';
  try {
    return new URL(value, base).origin === base;
  } catch {
    return false;
  }
}

export function assertHttpOrHttpsUrl(value: string, label = 'URL') {
  if (!isHttpOrHttpsUrl(value)) {
    throw new Error(`${label} must use http:// or https://`);
  }
  return value;
}

export const allowedMarkdownLinkProtocols = MARKDOWN_PROTOCOLS;
