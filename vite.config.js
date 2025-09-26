import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom manual chunk strategy to keep initial bundle smaller.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react';
          }
          
          // Chart libraries
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart';
          }
          
          // Firebase - split into smaller chunks
          if (id.includes('firebase/app') || id.includes('firebase/auth')) {
            return 'firebase-core';
          }
          if (id.includes('firebase/firestore')) {
            return 'firebase-firestore';
          }
          if (id.includes('firebase/storage') || id.includes('firebase/analytics')) {
            return 'firebase-other';
          }
          
          // UI libraries
          if (id.includes('lucide-react')) {
            return 'ui-icons';
          }
          if (id.includes('@react-spring')) {
            return 'animations';
          }
          
          // Utilities
          if (id.includes('node_modules') && !id.includes('firebase') && !id.includes('react') && !id.includes('chart')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to 1MB to reduce warnings
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
    css: true
  }
});
