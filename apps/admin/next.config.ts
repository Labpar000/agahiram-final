import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/admin',
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    // Admin panel only renders small remote thumbnails (already optimized on the
    // S3 worker side). Skipping Next's optimizer keeps it consistent with the
    // web app and avoids extra egress through ArvanCloud S3 from the VPS.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.arvanstorage.ir' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    const apiUpstream =
      process.env.API_UPSTREAM_URL ?? process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000';
    return [{ source: '/api/v1/:path*', destination: `${apiUpstream}/api/v1/:path*` }];
  },
};

export default config;
