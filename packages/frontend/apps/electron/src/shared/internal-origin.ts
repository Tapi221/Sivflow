export const mainHost = '.';
export const anotherHost = 'another-host';
export const internalHosts = new Set([mainHost, anotherHost]);

const devServerBase = process.env.DEV_SERVER_URL;
const useDevServer =
  process.env.NODE_ENV === 'development' && !!devServerBase;
const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, '');

export const mainWindowOrigin = useDevServer
  ? normalizeOrigin(devServerBase)
  : `assets://${mainHost}`;
export const anotherOrigin = `assets://${anotherHost}`;

export const onboardingViewUrl = `${mainWindowOrigin}/onboarding`;
export const shellViewUrl = `${mainWindowOrigin}/shell.html`;
export const backgroundWorkerViewUrl = `${mainWindowOrigin}/background-worker.html`;
export const customThemeViewUrl = `${mainWindowOrigin}/theme-editor`;

// ポップアップウィンドウがメインウィンドウと同じズーム倍率を共有する問題を避ける。
// Electron 公式ドキュメントより:
// 「Chromium レベルのズームポリシーは同一オリジン単位なので、特定ドメインのズーム倍率は同じドメインを使うすべてのウィンドウへ伝播する。ウィンドウ URL を分けることで、ウィンドウごとにズームを扱えるようになる。」
export const popupViewUrl = `${anotherOrigin}/popup.html`;

export const isInternalUrl = (url: string) => {
  try {
    const parsed = new URL(url);

    if (useDevServer) {
      return normalizeOrigin(parsed.origin) === mainWindowOrigin;
    }

    return parsed.protocol === 'assets:' && internalHosts.has(parsed.hostname);
  } catch {
    return false;
  }
};
