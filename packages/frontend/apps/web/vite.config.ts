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
    // ビルド時だけ JavaScript の auto-accessor として読める形にそろえる。
    return code.replace(/\bprivate\s+accessor\b/g, 'accessor');
  },
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  assetsInclude: ['**/*.zip'],
  define: {
    BUILD_CONFIG: JSON.stringify(buildConfig),
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
});
