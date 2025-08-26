import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom manual chunk strategy to keep initial bundle smaller.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          chart: ['chart.js', 'react-chartjs-2'],
          firebase: ['firebase/app','firebase/auth','firebase/firestore','firebase/storage'],
          ui: ['lucide-react']
        }
      }
    }
  }
});
