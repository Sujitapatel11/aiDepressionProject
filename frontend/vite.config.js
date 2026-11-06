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
  // Vitest (frontend unit tests): jsdom + Testing Library.
  // Include path is scoped to the creator-feed tests; the pre-existing
  // Jest-style tests under src/features/soul-identity/tests were written for
  // Jest (jest.fn, HTML collection queries) and predate any JSDOM/Vitest
  // tooling — they never had a runnable runner and are left untouched.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    include: [
      'src/components/**/*.test.jsx',
      'src/services/**/*.test.js',
      'src/pages/**/*.test.jsx',
    ],
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
