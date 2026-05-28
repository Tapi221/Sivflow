/**
 * Google Identity Services (GIS) Token Client ラッパー
 *
 * Web 版で Google Calendar access_token をサイレントに取得するための
 * ヘルパーモジュール。
 * GIS は prompt:'' を指定することで、すでに同意済みのユーザーに対して
 * ポップアップなしで新しい access_token を発行できる。
 *
 * 参考: https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */

// GIS スクリプトの URL
const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

// GIS スクリプトのロード済みフラグ
let _gisLoaded = false;

/**
 * GIS スクリプトを動的にロードする。
 * 複数回呼ばれても 1 回だけロードする。
 */
const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 既にロード済みの場合はスキップ
    if (
      _gisLoaded ||
      (typeof window !== "undefined" && window.google?.accounts)
    ) {
      _gisLoaded = true;
      resolve();
      return;
    }

    // すでに script タグが挿入されている場合はロード完了を待つ
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => {
        _gisLoaded = true;
        resolve();
      });
      existing.addEventListener("error", reject);
      return;
    }

    // 新しく script タグを挿入
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;

    script.addEventListener("load", () => {
      _gisLoaded = true;
      resolve();
    });

    script.addEventListener("error", () => {
      reject(new Error("Google Identity Services の読み込みに失敗しました"));
    });

    document.head.appendChild(script);
  });
};

/**
 * GIS Token Client を使って Google Calendar の access_token を取得する。
 *
 * @param clientId - Web OAuth クライアント ID (VITE_WEB_GOOGLE_OAUTH_CLIENT_ID)
 * @param scope    - 要求するスコープ
 * @param silent   - true の場合 prompt:'' でサイレント取得を試みる
 *                   false の場合 prompt:'consent select_account' で同意画面を表示
 * @returns        - access_token 文字列
 * @throws         - サイレント取得失敗時または明示的拒否時
 */
export const requestWebAccessTokenViaGis = async ({
  clientId,
  scope,
  silent = false,
}: {
  clientId: string;
  scope: string;
  silent?: boolean;
}): Promise<string> => {
  // GIS スクリプトをロード（初回のみ）
  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const googleAccounts = window.google?.accounts;

    if (!googleAccounts) {
      reject(new Error("Google Identity Services is not available"));
      return;
    }

    // GIS Token Client を初期化
    const client = googleAccounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      // サイレントモード: 空文字 = ブラウザのセッションを利用してポップアップなしで取得
      // 明示モード: 'consent select_account' = 同意画面を表示
      prompt: silent ? "" : "consent select_account",

      callback: (response) => {
        if (response.error) {
          // サイレント失敗（login_required, interaction_required 等）
          reject(new Error(response.error_description ?? response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("GIS token response did not include access_token"));
          return;
        }

        resolve(response.access_token);
      },

      error_callback: (error) => {
        reject(
          new Error(
            (error as { message?: string }).message ??
              "GIS token request failed",
          ),
        );
      },
    });

    client.requestAccessToken();
  });
};
