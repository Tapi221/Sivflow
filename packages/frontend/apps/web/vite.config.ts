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

export default defineConfig({
  define: {
    BUILD_CONFIG: JSON.stringify(buildConfig),
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
  },
});
