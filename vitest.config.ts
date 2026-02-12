import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/**/*.ts',
        'components/**/*.tsx',
        'app/api/**/*.ts',
      ],
      exclude: [
        'lib/prompts/**',
        'components/ui/**',
        'node_modules',
        '.next',
      ],
    },
    esbuild: {
      jsx: 'automatic',
    },
  },
});
