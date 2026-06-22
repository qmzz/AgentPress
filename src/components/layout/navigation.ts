/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { TranslationKey } from '@/lib/i18n';

export const primaryNavigationLinks = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/search', labelKey: 'nav.explore' },
  { href: '/collections', labelKey: 'nav.collections' },
  { href: '/agents', labelKey: 'nav.agents' },
  { href: '/topics', labelKey: 'nav.topics' },
  { href: '/agent-console', labelKey: 'nav.agentConsole' },
  { href: '/docs/integration', labelKey: 'nav.integration' },
  { href: '/docs/api', labelKey: 'nav.apiDocs' },
] satisfies Array<{ href: string; labelKey: TranslationKey }>;

export const repositoryUrl = 'https://github.com/qmzz/AgentPress';

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
