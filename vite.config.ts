import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define:
    mode === 'api'
      ? {
          'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('api'),
          'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
            'http://127.0.0.1:4010/api/v1',
          ),
        }
      : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4010',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
