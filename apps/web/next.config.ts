import type { NextConfig } from 'next';
// @ts-expect-error next-pwa has no types
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  disable: process.env.NODE_ENV === 'development',
  // Never cache auth/login flows or HTML pages that could lock users into a
  // stale build. We only cache static images + non-auth API GETs.
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /\/api\/v1\/auth\/.*/i,
      handler: 'NetworkOnly',
      options: { cacheName: 'auth-no-cache' },
    },
    {
      urlPattern: ({ request, url }: { request: Request; url: URL }) =>
        request.mode === 'navigate' &&
        (url.pathname === '/login' || url.pathname.startsWith('/onboarding')),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Proxy /api requests to the NestJS backend so the browser sees a same-origin API.
  // This removes the cross-origin cookie/CORS headaches in dev and keeps the same
  // production code path when API and Web are served behind the same reverse proxy (Caddy).
  async rewrites() {
    const apiUpstream =
      process.env.API_UPSTREAM_URL ?? process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000';
    return [
      { source: '/api/v1/:path*', destination: `${apiUpstream}/api/v1/:path*` },
      { source: '/socket.io/:path*', destination: `${apiUpstream}/socket.io/:path*` },
    ];
  },
};

export default withPWA(nextConfig);
