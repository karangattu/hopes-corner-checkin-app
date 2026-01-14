import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Empty config to silence warnings
  },
  images: {
    domains: [],
  },
};

export default nextConfig;
