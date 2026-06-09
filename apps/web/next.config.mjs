import path from 'node:path';
import { fileURLToPath } from 'node:url';
import withSerwistInit from '@serwist/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

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
 * inside the docker network.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  register: false,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  images: {
    unoptimized: process.env.IMAGE_OPTIMIZATION === 'off',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 96, 128, 200, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    localPatterns: [
      { pathname: '/api/v1/media/object' },
      { pathname: '/**', search: '' },
    ],
  },
  experimental: {
    viewTransition: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.join(repoRoot, 'node_modules/react'),
        'react-dom': path.join(repoRoot, 'node_modules/react-dom'),
        'react/jsx-runtime': path.join(repoRoot, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.join(repoRoot, 'node_modules/react/jsx-dev-runtime'),
      };
    }
    return config;
  },
  async rewrites() {
    const apiUpstream =
      process.env.API_UPSTREAM_URL || process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
    return [
      { source: '/api/v1/:path*', destination: `${apiUpstream}/api/v1/:path*` },
      { source: '/socket.io/:path*', destination: `${apiUpstream}/socket.io/:path*` },
    ];
  },
  async headers() {
    return [
      {
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

export default withSerwist(nextConfig);
