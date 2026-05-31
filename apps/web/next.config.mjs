import withPWAInit from 'next-pwa';

/**
 * Web app Next.js config.
 *
 * NOTE: This file ships in the production Docker image (`Dockerfile.web` COPYs
 * it into the runtime image). That's important: the Next.js image optimiser
 * re-reads `next.config.*` at server startup for the live `images` config
 * (allowed widths, `localPatterns`, etc.) and the live `rewrites()` (so the
 * `API_UPSTREAM_URL` env var actually takes effect). When this file is missing
 * at runtime, Next.js silently falls back to the default image sizes and the
 * 127.0.0.1 fallback for rewrites, which breaks `/_next/image?url=/api/v1/...`
 * inside the docker network. We keep it as `.mjs` (not `.ts`) so the runtime
 * image doesn't need TypeScript installed.
 */
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
      urlPattern: ({ request, url }) =>
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
      urlPattern: /\/api\/v1\/(posts|users|notifications|messages)\/.*/i,
      handler: 'NetworkOnly',
      options: { cacheName: 'api-fresh' },
    },
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: 'NetworkOnly',
      options: { cacheName: 'api-fresh-all' },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  images: {
    // On-the-fly optimization (AVIF/WebP + responsive resizing) needs the `sharp`
    // binary at runtime. On the constrained Iran VPS we ship the linux-musl build
    // via .npmrc `supportedArchitectures`. If sharp is ever unavailable, set
    // IMAGE_OPTIMIZATION=off to fall back to passthrough so images keep working.
    unoptimized: process.env.IMAGE_OPTIMIZATION === 'off',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 96, 128, 200, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    // Next 15 blocks local image URLs that carry a query string unless they
    // match an explicit pattern (CVE-2024-46982 hardening). Our API serves
    // media via `/api/v1/media/object?key=<encoded S3 key>`, so we need to
    // whitelist that route. Anything else under `/` is still allowed but only
    // without a query string.
    localPatterns: [
      { pathname: '/api/v1/media/object' },
      { pathname: '/**', search: '' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@agahiram/ui'],
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
  async headers() {
    return [
      {
        // Hashed build assets are content-addressed and safe to cache forever.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default withPWA(nextConfig);
