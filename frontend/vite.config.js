import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Proxy /api and /ws to Django backend in development.
    // This makes React dev server behave like the same-origin Django setup,
    // eliminating CORS issues and matching the production deployment model.
    proxy: {
      '/api': {
        target:      'http://127.0.0.1:8000',
        changeOrigin: true,
        secure:       false,
      },
      '/ws': {
        target:    'ws://127.0.0.1:8000',
        ws:         true,
        changeOrigin: true,
        secure:       false,
      },
    },
  },
});
