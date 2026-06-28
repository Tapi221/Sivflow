import path from 'node:path';

import { app, protocol } from 'electron';

import { createApplicationMenu } from './application-menu/create';
import { buildType, isDev, overrideSession } from './config';
import { persistentConfig } from './config-storage/persist';
import { setupDeepLink } from './deep-link';
import { registerEvents } from './events';
import { registerHandlers } from './handlers';
import { logger } from './logger';
import { registerProtocol } from './protocol';
import { setupRecordingFeature } from './recording/feature';
import { registerSecurityRestrictions } from './security-restrictions';
import { setupTrayState } from './tray';
import { registerUpdater } from './updater';
import { launch } from './windows-manager/launcher';
import { launchStage } from './windows-manager/stage';

app.enableSandbox();

if (isDev) {
  app.commandLine.appendSwitch('host-resolver-rules', 'MAP 0.0.0.0 127.0.0.1');
}

const disabledFeatures = [
  'PlzDedicatedWorker',
  'CalculateNativeWinOcclusion',
  'AutofillServerCommunication',
  'AutofillProfileCleanup',
  'AutofillAddressProfileSavePrompt',
  'AutofillPaymentCards',
  'AutofillEnableAccountWalletStorage',
  'SavePasswordBubble',
].join(',');
app.commandLine.appendSwitch('disable-features', disabledFeatures);
app.commandLine.appendSwitch('disable-blink-features', 'Autofill');

const enabledFeatures = [
  'DocumentPolicyIncludeJSCallStacksInCrashReports',
  'EarlyEstablishGpuChannel',
  'EstablishGpuChannelAsync',
].join(',');
app.commandLine.appendSwitch('enable-features', enabledFeatures);
const enabledBlinkFeatures = ['CSSTextAutoSpace', 'WebCodecs'].join(',');
app.commandLine.appendSwitch('enable-blink-features', enabledBlinkFeatures);
app.commandLine.appendSwitch('force-color-profile', 'srgb');

if (overrideSession) {
  const appName = buildType === 'stable' ? 'Sivflow' : `Sivflow-${buildType}`;
  const userDataPath = path.join(app.getPath('appData'), appName);
  app.setPath('userData', userDataPath);
  app.setPath('sessionData', userDataPath);
}

if (require('electron-squirrel-startup')) app.quit();

if (process.env.SKIP_ONBOARDING) {
  launchStage.value = 'main';
  persistentConfig.set({
    onBoarding: false,
  });
}

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  logger.info(
    'Another instance is running or responding deep link, exiting...'
  );
  app.quit();
  process.exit(0);
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (app.isReady()) {
    launch().catch(e => console.error('Failed launch:', e));
  }
});

setupDeepLink(app);
registerSecurityRestrictions();

app
  .whenReady()
  .then(registerProtocol)
  .then(registerHandlers)
  .then(registerEvents)
  .then(launch)
  .then(createApplicationMenu)
  .then(registerUpdater)
  .then(setupRecordingFeature)
  .then(setupTrayState)
  .catch(e => console.error('Failed create window:', e));

if (process.env.SENTRY_RELEASE) {
  const telemetryModule = ['@sentry', 'electron', 'main'].join('/');
  import(telemetryModule)
    .then(telemetry => {
      telemetry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.BUILD_TYPE ?? 'development',
        ipcMode: telemetry.IPCMode.Protocol,
        transportOptions: {
          maxAgeDays: 30,
          maxQueueSize: 100,
        },
      });
      telemetry.setTags({
        distribution: 'electron',
        appVersion: app.getVersion(),
      });
    })
    .catch(e => console.error('Failed init telemetry:', e));
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'assets',
    privileges: {
      secure: true,
      corsEnabled: true,
      supportFetchAPI: true,
      standard: true,
      stream: true,
    },
  },
]);
