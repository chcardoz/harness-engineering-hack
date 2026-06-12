import { join } from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Compile our workspace packages (they ship raw TS/TSX).
  transpilePackages: [
    '@yougrep/config',
    '@yougrep/db',
    '@yougrep/auth',
    '@yougrep/domain',
    '@yougrep/integrations',
    '@yougrep/logger',
    '@yougrep/openui',
    '@yougrep/agents',
  ],
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  // Monorepo: trace server files from the repo root so workspace packages are
  // bundled correctly on Vercel (Root Directory = apps/web → cwd is apps/web).
  outputFileTracingRoot: join(process.cwd(), '..', '..'),
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
