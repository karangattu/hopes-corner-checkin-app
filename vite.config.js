import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Read version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const appVersion = packageJson.version;

// Custom manual chunk strategy to keep initial bundle smaller.
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    globals: true,
    css: true,
    testTimeout: 10000, // 10 second timeout
    hookTimeout: 10000, // 10 second timeout for hooks
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/checkin-app-nextjs/**' // Exclude Next.js version tests
    ],
  },
});
