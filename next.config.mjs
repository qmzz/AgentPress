/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Enables unauthorized() / forbidden() in server components. The /admin
    // layout uses it as a server-side auth fallback in case the proxy does not
    // run, so an unauthenticated render answers 401 instead of leaking the shell.
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|api|uploads|feed.xml).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
      { protocol: 'https', hostname: 'cdn.*.com' },
    ],
    unoptimized: true,
  },
};

export default nextConfig;

