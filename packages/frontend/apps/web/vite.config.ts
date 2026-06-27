import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const buildConfig = {
  SENTRY_DSN: '',
  appBuildType: 'local',
  appVersion: '0.26.3',
  debug: true,
  distribution: 'web',
  editorVersion: '0.26.3',
  isElectron: false,
  isIOS: false,
  isMobileEdition: false,
  isNative: false,
};

const rollupCompatibleTarget = 'es2021' as const;

const stripPrivateAccessorPlugin = {
  name: 'sivflow-strip-private-accessor',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!/\.[cm]?[tj]sx?(?:\?|$)/.test(id)) {
      return null;
    }

    if (!code.includes('private accessor')) {
      return null;
    }

    // Rollup が TypeScript の private accessor をそのまま読むと落ちるため、
    // 先に private を外し、esbuild の ES2021 変換で auto-accessor を通常構文へ下げる。
    return code.replace(/\bprivate\s+accessor\b/g, 'accessor');
  },
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  assetsInclude: ['**/*.zip'],
  build: {
    target: rollupCompatibleTarget,
  },
  define: {
    BUILD_CONFIG: JSON.stringify(buildConfig),
  },
  esbuild: {
    target: rollupCompatibleTarget,
  },
  plugins: [stripPrivateAccessorPlugin, react()],
  resolve: {
    alias: {
      '@affine/core': path.resolve(__dirname, '../../core/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
  },
  worker: {
    // nbstore.worker は SharedWorker/Worker ともに module として起動しているため、
    // 分割出力に対応できない既定の iife ではなく ES module で出力する。
    format: 'es',
  },
});