import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vite';

dns.setDefaultResultOrder('verbatim');

const defaultDevServerPort = 8080;
const parsePort = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const port = Number.parseInt(value, 10);

  return Number.isInteger(port) && port > 0 && port < 65536
    ? port
    : undefined;
};
const getCliPortArg = (argv: string[]) => {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--port' || arg === '-p') {
      return parsePort(argv[index + 1]);
    }

    if (arg.startsWith('--port=')) {
      return parsePort(arg.slice('--port='.length));
    }
  }

  return undefined;
};
const devServerPort =
  parsePort(process.env.SIVFLOW_WEB_PORT) ??
  getCliPortArg(process.argv) ??
  defaultDevServerPort;
const devServerHost = '127.0.0.1';
const backendProxyTarget =
  process.env.SIVFLOW_BACKEND_URL ??
  process.env.AFFINE_BACKEND_URL ??
  'http://127.0.0.1:3010';
const backendEnabled =
  process.env.SIVFLOW_ENABLE_BACKEND === 'true' ||
  process.env.AFFINE_ENABLE_BACKEND === 'true' ||
  Boolean(process.env.SIVFLOW_BACKEND_URL || process.env.AFFINE_BACKEND_URL);

const buildConfig = {
  SENTRY_DSN: '',
  appBuildType: 'local',
  appVersion: '0.26.3',
  backendEnabled,
  debug: true,
  distribution: 'web',
  editorVersion: '0.26.3',
  isElectron: false,
  isIOS: false,
  isMobileEdition: false,
  isNative: false,
  isWeb: true,
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

const backendProxy = backendEnabled
  ? {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/graphql': {
        target: backendProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/oauth': {
        target: backendProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: backendProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    }
  : undefined;

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
    proxy: backendProxy,
  },
  worker: {
    format: 'es',
  },
});
