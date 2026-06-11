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

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
let _gisLoaded = false;



const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (_gisLoaded || (typeof window !== "undefined" && window.google?.accounts)) {
      _gisLoaded = true;
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        _gisLoaded = true;
        resolve();
      });
      existing.addEventListener("error", reject);
      return;
    }

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
const normalizeLoginHint = (loginHint: string | null | undefined): string | undefined => {
  const normalized = loginHint?.trim();
  return normalized ? normalized : undefined;
};
const requestWebAccessTokenViaGis = async ({ clientId, scope, silent = false, loginHint }: { clientId: string;
  scope: string;
  silent?: boolean;
  loginHint?: string | null;
}): Promise<string> => {
  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const googleAccounts = window.google?.accounts;

    if (!googleAccounts) {
      reject(new Error("Google Identity Services is not available"));
      return;
    }

    const prompt = silent ? "" : "consent select_account";
    const normalizedLoginHint = normalizeLoginHint(loginHint);
    const overrideConfig = normalizedLoginHint ? { login_hint: normalizedLoginHint, prompt } : { prompt };
    const client = googleAccounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      prompt,
      callback: (response) => {
        if (response.error) {
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
        reject(new Error((error as { message?: string; }).message ?? "GIS token request failed"));
      },
    });

    client.requestAccessToken(overrideConfig);
  });
};



export { requestWebAccessTokenViaGis };
