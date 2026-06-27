import type { AppAdapter } from 'electron-updater/out/AppAdapter';

/**
 * test 用です。次と同等の実装です:
 * https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/ElectronAppAdapter.ts
 */
export class MockedAppAdapter implements AppAdapter {
  version: string;
  name = 'AFFiNE-testing';
  isPackaged = true;
  appUpdateConfigPath = '';
  userDataPath = '';
  baseCachePath = '';

  constructor(version: string) {
    this.version = version;
  }

  whenReady() {
    return Promise.resolve();
  }

  relaunch() {
    return;
  }

  quit() {
    return;
  }

  onQuit(_handler: (exitCode: number) => void) {
    return;
  }
}
