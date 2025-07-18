import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts', // Optional: for setup files
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});