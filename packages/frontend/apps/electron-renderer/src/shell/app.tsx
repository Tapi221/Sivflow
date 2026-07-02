import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import { WindowsAppControls } from '@affine/core/components/pure/header/windows-app-controls';
import { ThemeProvider } from '@affine/core/components/theme-provider';
import { configureElectronStateStorageImpls } from '@affine/core/desktop/storage';
import { configureAppSidebarModule } from '@affine/core/modules/app-sidebar';
import { AppTabsHeaderService } from '@affine/core/modules/app-tabs-header';
import { ShellAppSidebarFallback } from '@affine/core/modules/app-sidebar/views';
import {
  AppTabsHeader,
  configureAppTabsHeaderModule,
} from '@affine/core/modules/app-tabs-header';
import {
  configureDesktopApiModule,
  DesktopApiService,
} from '@affine/core/modules/desktop-api';
import { configureI18nModule, I18nProvider } from '@affine/core/modules/i18n';
import { configureStorageModule } from '@affine/core/modules/storage';
import { configureAppThemeModule } from '@affine/core/modules/theme';
import {
  Framework,
  FrameworkRoot,
  useLiveData,
  useService,
} from '@toeverything/infra';

import * as styles from './app.css';

const framework = new Framework();
configureStorageModule(framework);
configureElectronStateStorageImpls(framework);
configureAppTabsHeaderModule(framework);
configureAppSidebarModule(framework);
configureI18nModule(framework);
configureDesktopApiModule(framework);
configureAppThemeModule(framework);
const frameworkProvider = framework.provider();

function ShellLoadFailurePanel() {
  const tabsHeaderService = useService(AppTabsHeaderService);
  const desktopApi = useService(DesktopApiService);
  const tabs = useLiveData(tabsHeaderService.tabsStatus$);
  const activeTab = tabs.find(tab => tab.active);
  const loadError = activeTab?.loadError;

  if (!loadError) {
    return null;
  }

  const isLocalDevServerError =
    BUILD_CONFIG.debug &&
    /^https?:\/\/127\.0\.0\.1:8080\/?/i.test(loadError.url);

  const handleRetry = () => {
    desktopApi.handler.ui.reloadView().catch(console.error);
  };

  const handleOpenDevTools = () => {
    desktopApi.handler.ui.showDevTools().catch(console.error);
  };

  return (
    <div className={styles.loadFailurePanel}>
      <div className={styles.loadFailureCard}>
        <div className={styles.loadFailureEyebrow}>Renderer Load Failed</div>
        <h2 className={styles.loadFailureTitle}>
          This tab could not be loaded.
        </h2>
        <p className={styles.loadFailureText}>
          {isLocalDevServerError
            ? 'Electron is waiting for the local web renderer, but http://127.0.0.1:8080 is not responding.'
            : 'Electron could not finish loading the active tab renderer.'}
        </p>
        <code className={styles.loadFailureUrl}>{loadError.url}</code>
        <p className={styles.loadFailureMeta}>
          {loadError.description} ({loadError.code})
        </p>
        {isLocalDevServerError ? (
          <p className={styles.loadFailureHint}>
            Start the renderer with `npm run dev:electron` or `npm --workspace @affine/web run dev`, then retry.
          </p>
        ) : null}
        <div className={styles.loadFailureActions}>
          <button
            className={styles.loadFailureButton}
            onClick={handleRetry}
            type="button"
          >
            Retry
          </button>
          <button
            className={styles.loadFailureButton}
            onClick={handleOpenDevTools}
            type="button"
          >
            Open DevTools
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const { appSettings } = useAppSettingHelper();
  const translucent =
    BUILD_CONFIG.isElectron &&
    environment.isMacOs &&
    appSettings.enableBlurBackground;

  return (
    <FrameworkRoot framework={frameworkProvider}>
      <ThemeProvider>
        <I18nProvider>
          <div className={styles.root} data-translucent={translucent}>
            <AppTabsHeader mode="shell" className={styles.appTabsHeader} />
            <div className={styles.body}>
              <ShellAppSidebarFallback />
              <ShellLoadFailurePanel />
            </div>
            {environment.isWindows && (
              <div style={{ position: 'fixed', right: 0, top: 0, zIndex: 5 }}>
                <WindowsAppControls />
              </div>
            )}
          </div>
        </I18nProvider>
      </ThemeProvider>
    </FrameworkRoot>
  );
}
