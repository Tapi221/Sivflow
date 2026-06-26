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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  assetsInclude: ['**/*.zip'],
  define: {
    BUILD_CONFIG: JSON.stringify(buildConfig),
  },
  plugins: [react()],
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
