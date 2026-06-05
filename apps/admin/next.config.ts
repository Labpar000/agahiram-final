import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const adminBasePath = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH ?? '/admin';

const config: NextConfig = {
  basePath: adminBasePath === '/' ? undefined : adminBasePath,
  reactStrictMode: true,
  transpilePackages: ['@agahiram/shared', '@agahiram/ui'],
  experimental: {
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
