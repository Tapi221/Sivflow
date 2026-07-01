import { NotificationCenter } from '@affine/component';
import { DefaultServerService } from '@affine/core/modules/cloud';
import { FrameworkScope, useService } from '@toeverything/infra';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { CustomThemeModifier } from './custom-theme';

const GlobalDialogs = lazy(() =>
  import('../../dialogs').then(module => ({
    default: module.GlobalDialogs,
  }))
);
const FindInPagePopup = lazy(() =>
  import('./find-in-page/find-in-page-popup').then(module => ({
    default: module.FindInPagePopup,
  }))
);

export const RootWrapper = () => {
  const defaultServerService = useService(DefaultServerService);
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    if (isServerReady) {
      return;
    }
    const abortController = new AbortController();
    defaultServerService.server
      .waitForConfigRevalidation(abortController.signal)
      .then(() => setIsServerReady(true))
      .catch(console.error);
    return () => abortController.abort();
  }, [defaultServerService, isServerReady]);

  return (
    <FrameworkScope scope={defaultServerService.server.scope}>
      <Suspense fallback={null}>
        <GlobalDialogs />
      </Suspense>
      <NotificationCenter />
      <Outlet />
      <CustomThemeModifier />
      {BUILD_CONFIG.isElectron && (
        <Suspense fallback={null}>
          <FindInPagePopup />
        </Suspense>
      )}
    </FrameworkScope>
  );
};
