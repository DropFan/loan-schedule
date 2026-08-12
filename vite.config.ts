import { copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

function versionJsonPlugin(): Plugin {
  return {
    name: 'static-hosting-files',
    writeBundle(options) {
      const dir = options.dir || resolve(__dirname, 'dist');
      writeFileSync(
        resolve(dir, 'version.json'),
        JSON.stringify({ version: pkg.version }),
      );
      // GitHub Pages 将未知路径交给 404.html，复制 SPA 入口以支持深层路由刷新
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    versionJsonPlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      filename: 'service-worker.js',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/version\.json$/],
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/vite-env.d.ts', 'src/test-setup.ts'],
    },
  },
});
