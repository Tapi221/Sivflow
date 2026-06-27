import '@affine/env/constant';
import '@blocksuite/affine/global/types';

declare module '@blocksuite/affine/store' {
  interface DocMeta {
    /**
     * @deprecated
     */
    favorite?: boolean;
    trash?: boolean;
    trashDate?: number;
    updatedDate?: number;
    mode?: 'page' | 'edgeless';
    // 将来的に number 対応する予定
    isPublic?: boolean;
  }
}

declare global {
  type Environment = {
    // 配布形態
    isSelfHosted: boolean;

    // デバイス
    isLinux: boolean;
    isMacOs: boolean;
    isIOS: boolean;
    isSafari: boolean;
    isWindows: boolean;
    isFireFox: boolean;
    isMobile: boolean;
    isChrome: boolean;
    isPwa: boolean;
    chromeVersion?: number;

    // 実行時設定
    publicPath: string;
    subPath: string;
  };

  var process: {
    env: Record<string, string>;
  };
  var environment: Environment;
  var $AFFINE_SETUP: boolean | undefined;
  /**
   * https://www.npmjs.com/package/@sentry/webpack-plugin により注入される
   */
  var SENTRY_RELEASE: { id: string } | undefined;
}
