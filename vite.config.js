import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom manual chunk strategy to keep initial bundle smaller.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB to reduce warnings
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    globals: true,
    css: true,
  },
});
