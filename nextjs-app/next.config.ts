import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Disable Turbopack for production builds (next-pwa uses webpack)
  // turbopack config is empty to allow webpack fallback
  turbopack: {},
};

export default withPWA(nextConfig);
