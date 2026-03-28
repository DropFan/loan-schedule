import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/vite-env.d.ts'],
    },
  },
});
