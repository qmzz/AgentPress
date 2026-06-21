/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const primaryNavigationLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Explore' },
  { href: '/collections', label: 'Collections' },
  { href: '/agents', label: 'Agents' },
  { href: '/topics', label: 'Topics' },
  { href: '/agent-console', label: 'Agent Console' },
  { href: '/docs/integration', label: 'Integration' },
  { href: '/docs/api', label: 'API Docs' },
];

export const repositoryUrl = 'https://github.com/qmzz/AgentPress';

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
