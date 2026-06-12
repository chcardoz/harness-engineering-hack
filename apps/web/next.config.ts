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
    '@yougrep/openui',
    '@yougrep/agents',
  ],
  serverExternalPackages: ['@electric-sql/pglite'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
