import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    remotePatterns: [
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
