import { AffineContext } from '@affine/core/components/context';
import { AppContainer } from '@affine/core/desktop/components/app-container';
import { router } from '@affine/core/desktop/router';
import { appInfo } from '@affine/electron-api';
import { configureDesktopApiModule } from '@affine/core/modules/desktop-api';
import { configureCommonModules } from '@affine/core/modules';
import { I18nProvider } from '@affine/core/modules/i18n';
import { LifecycleService } from '@affine/core/modules/lifecycle';
import {
  configureLocalStorageStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import { PopupWindowProvider } from '@affine/core/modules/url';
import { configureBrowserWorkbenchModule } from '@affine/core/modules/workbench';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import createEmotionCache from '@affine/core/utils/create-emotion-cache';
import { StoreManagerClient } from '@affine/nbstore/worker/client';
import { setTelemetryTransport } from '@affine/track';
import { CacheProvider } from '@emotion/react';
import { Framework, FrameworkRoot, getCurrentStore } from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';

import nbstoreSharedWorkerUrl from './nbstore.worker.ts?sharedworker&url';
import nbstoreWorkerUrl from './nbstore.worker.ts?worker&url';

const cache = createEmotionCache();

function createStoreManagerClient() {
  if (
    window.SharedWorker &&
    localStorage.getItem('disableSharedWorker') !== 'true'
  ) {
    try {
      const worker = new SharedWorker(nbstoreSharedWorkerUrl, {
        name: 'affine-shared-worker',
        type: 'module',
      });
      return new StoreManagerClient(new OpClient(worker.port));
    } catch (err) {
      console.warn(
        '共有ワーカーの起動に失敗したため、専用ワーカーに切り替えます',
        err
      );
    }
  }

  const worker = new Worker(nbstoreWorkerUrl, { type: 'module' });
  return new StoreManagerClient(new OpClient(worker));
}

const storeManagerClient = createStoreManagerClient();
setTelemetryTransport(storeManagerClient.telemetry);
window.addEventListener('beforeunload', () => {
  storeManagerClient.dispose();
});
window.addEventListener('focus', () => {
  storeManagerClient.resume();
});
window.addEventListener('click', () => {
  storeManagerClient.resume();
});
window.addEventListener('blur', () => {
  storeManagerClient.pause();
});

const future = {
  v7_startTransition: true,
} as const;

const framework = new Framework();
configureCommonModules(framework);
configureBrowserWorkbenchModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
if (appInfo?.electron) {
  configureDesktopApiModule(framework);
}
framework.impl(NbstoreProvider, {
  realtime: storeManagerClient.realtime,
  openStore(key, options) {
    return storeManagerClient.open(key, options);
  },
});
framework.impl(PopupWindowProvider, {
  open: (target: string) => {
    const targetUrl = new URL(target);

    let url: string;
    // safe to open directly if in the same origin
    if (targetUrl.origin === location.origin) {
      url = target;
    } else {
      const redirectProxy = location.origin + '/redirect-proxy';
      const search = new URLSearchParams({
        redirect_uri: target,
      });

      url = `${redirectProxy}?${search.toString()}`;
    }
    window.open(url, '_blank', 'popup noreferrer noopener');
  },
});
const frameworkProvider = framework.provider();

// setup application lifecycle events, and emit application start event
const emitApplicationFocused = () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
};

window.addEventListener('focus', emitApplicationFocused);
window.addEventListener('pageshow', emitApplicationFocused);
frameworkProvider.get(LifecycleService).applicationStart();

export function App() {
  return (
    <Suspense fallback={<AppContainer fallback />}>
      <FrameworkRoot framework={frameworkProvider}>
        <CacheProvider value={cache}>
          <I18nProvider>
            <AffineContext store={getCurrentStore()}>
              <RouterProvider
                fallbackElement={<AppContainer fallback />}
                router={router}
                future={future}
              />
            </AffineContext>
          </I18nProvider>
        </CacheProvider>
      </FrameworkRoot>
    </Suspense>
  );
}
