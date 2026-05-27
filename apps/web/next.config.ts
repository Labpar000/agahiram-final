import type { NextConfig } from 'next';
// @ts-expect-error next-pwa has no types
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
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
