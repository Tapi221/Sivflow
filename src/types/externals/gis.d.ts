/**
 * Google Identity Services (GIS) Token Client の最小限の型定義。
 * 公式 npm パッケージ @types/google.accounts.id は ID トークン向けのみのため、
 * ここで Token Client に必要な型を独自定義する。
 *
 * 参考: https://developers.google.com/identity/oauth2/web/reference/js-reference#TokenClient
 */

interface GisTokenClientCallbackResponse {
  /** 取得したアクセストークン */
  access_token: string;
  /** エラーコード（成功時は未定義） */
  error?: string;
  /** エラーの詳細説明 */
  error_description?: string;
}

interface GisTokenClientConfig {
  /** Web OAuth クライアント ID */
  client_id: string;
  /** スペース区切りのスコープ文字列 */
  scope: string;
  /**
   * 同意プロンプトの表示制御。
   * - ''             : サイレント取得を試みる（推奨）
   * - 'none'         : サイレント（失敗時はエラー、UX リスクあり）
   * - 'consent'      : 同意画面を表示
   * - 'select_account' : アカウント選択画面を表示
   */
  prompt?: string;
  /** トークン取得成功・失敗時のコールバック */
  callback: (response: GisTokenClientCallbackResponse) => void;
  /** エラーコールバック（ネットワークエラー等） */
  error_callback?: (error: unknown) => void;
}

interface GisTokenClientRequestOptions {
  /** アカウントヒント（メールアドレス） */
  hint?: string;
  /** プロンプト上書き */
  prompt?: string;
}

interface GisTokenClient {
  requestAccessToken(options?: GisTokenClientRequestOptions): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GisTokenClientConfig): GisTokenClient;
          revoke(token: string, done?: () => void): void;
        };
        id: {
          initialize(config: unknown): void;
          renderButton(element: HTMLElement, config: unknown): void;
          prompt(notification?: unknown): void;
          disableAutoSelect(): void;
        };
      };
    };
  }
}

export {};
