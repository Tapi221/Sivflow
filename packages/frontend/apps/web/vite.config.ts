import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vite';

dns.setDefaultResultOrder('verbatim');

const devServerPort = 8080;
const devServerHost = '127.0.0.1';

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
const privateAccessorText = ['private', 'accessor'].join(' ');
const privateAccessorPattern = new RegExp(
  `\\b${privateAccessorText.replace(' ', '\\s+')}\\b`,
  'g'
);

const stripPrivateAccessorPlugin = {
  name: 'sivflow-strip-private-accessor',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.match(/\.[cm]?[tj]sx?(?:\?|$)/)) {
      return null;
    }

    if (!code.includes(privateAccessorText)) {
      return null;
    }

    return code.replace(privateAccessorPattern, 'accessor');
  },
};

const viteFsPrefix = '/@fs/';
const vanillaExtractVirtualCssSuffix = '.vanilla.css';

const normalizeVanillaExtractFsVirtualCssPlugin = {
  name: 'sivflow-normalize-vanilla-extract-fs-virtual-css',
  enforce: 'pre' as const,
  resolveId(source: string) {
    const [validId, query] = source.split('?');

    if (
      !validId.startsWith(viteFsPrefix) ||
      !validId.endsWith(vanillaExtractVirtualCssSuffix)
    ) {
      return null;
    }

    const normalizedId = validId.slice(viteFsPrefix.length);

    return query ? `${normalizedId}?${query}` : normalizedId;
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
  plugins: [
    stripPrivateAccessorPlugin,
    normalizeVanillaExtractFsVirtualCssPlugin,
    vanillaExtractPlugin(),
    react(),
  ],
  resolve: {
    alias: {
      '@affine/core': path.resolve(__dirname, '../../core/src'),
    },
  },
  server: {
    host: devServerHost,
    port: devServerPort,
    strictPort: true,
    hmr: {
      host: devServerHost,
      clientPort: devServerPort,
      protocol: 'ws',
    },
  },
  worker: {
    format: 'es',
  },
});