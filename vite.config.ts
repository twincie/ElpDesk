import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_BASE_URL,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist'
  }
});