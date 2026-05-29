export type GoogleOAuthCallbackPayload = {
  type: "flashcard-master:google-oauth-callback";
  url: string;
  state: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
};

export const GOOGLE_OAUTH_CALLBACK_CHANNEL = "flashcard-master:google-oauth-callback";
export const GOOGLE_OAUTH_CALLBACK_STORAGE_KEY = "flashcard-master.google-oauth-callback";

const GOOGLE_OAUTH_CALLBACK_TITLE = "Google 連携を完了しています";
const GOOGLE_OAUTH_CALLBACK_DESCRIPTION = "元の画面で処理を続行します。";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

const hasGoogleOAuthCallbackResult = (url: URL): boolean => Boolean(url.searchParams.get("state")) && (url.searchParams.has("code") || url.searchParams.has("error"));

const renderMessage = (): void => {
  const root = document.getElementById("root");
  if (!root) return;
  const main = document.createElement("main");
  main.style.alignItems = "center";
  main.style.boxSizing = "border-box";
  main.style.display = "flex";
  main.style.flexDirection = "column";
  main.style.fontFamily = "system-ui, sans-serif";
  main.style.justifyContent = "center";
  main.style.minHeight = "100dvh";
  main.style.padding = "24px";
  main.style.textAlign = "center";

  const title = document.createElement("h1");
  title.style.fontSize = "18px";
  title.style.margin = "0 0 8px";
  title.textContent = GOOGLE_OAUTH_CALLBACK_TITLE;

  const description = document.createElement("p");
  description.style.fontSize = "14px";
  description.style.margin = "0";
  description.textContent = GOOGLE_OAUTH_CALLBACK_DESCRIPTION;

  main.append(title, description);
  root.replaceChildren(main);
};

const postCallbackPayloadToOpener = (payload: GoogleOAuthCallbackPayload): void => {
  try {
    if (!window.opener) return;
    window.opener.postMessage(payload, window.location.origin);
  } catch {
    // opener がない環境では BroadcastChannel / storage で通知する。
  }
};

const broadcastCallbackPayload = (payload: GoogleOAuthCallbackPayload): void => {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(GOOGLE_OAUTH_CALLBACK_CHANNEL);
  channel.postMessage(payload);
  channel.close();
};

const storeCallbackPayload = (payload: GoogleOAuthCallbackPayload): void => {
  try {
    localStorage.removeItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY);
    localStorage.setItem(GOOGLE_OAUTH_CALLBACK_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage が使えない環境では BroadcastChannel のみで通知する。
  }
};

const clearSensitiveCallbackUrl = (): void => {
  try {
    window.history.replaceState(null, document.title, `${window.location.origin}${window.location.pathname}`);
  } catch {
    // history を更新できない環境では表示中の URL をそのままにする。
  }
};

const closeCallbackWindow = (): void => {
  window.setTimeout(() => {
    try {
      window.close();
    } catch {
      // 自動クローズできないブラウザではメッセージ表示を残す。
    }
  }, 300);
};

const notifyCallbackPayload = (payload: GoogleOAuthCallbackPayload): void => {
  postCallbackPayloadToOpener(payload);
  broadcastCallbackPayload(payload);
  storeCallbackPayload(payload);
  clearSensitiveCallbackUrl();
  closeCallbackWindow();
};

export const createGoogleOAuthCallbackPayload = (url: URL): GoogleOAuthCallbackPayload | null => {
  if (!hasGoogleOAuthCallbackResult(url)) return null;
  return {
    type: GOOGLE_OAUTH_CALLBACK_CHANNEL,
    url: url.href,
    state: url.searchParams.get("state"),
    code: url.searchParams.get("code"),
    error: url.searchParams.get("error"),
    errorDescription: url.searchParams.get("error_description"),
  };
};

export const isGoogleOAuthCallbackPayload = (value: unknown): value is GoogleOAuthCallbackPayload => {
  if (!isRecord(value)) return false;
  return value.type === GOOGLE_OAUTH_CALLBACK_CHANNEL && typeof value.url === "string" && isNullableString(value.state) && isNullableString(value.code) && isNullableString(value.error) && isNullableString(value.errorDescription);
};

export const renderGoogleOAuthCallback = (): boolean => {
  if (typeof window === "undefined") return false;
  const payload = createGoogleOAuthCallbackPayload(new URL(window.location.href));
  if (!payload) return false;
  document.title = GOOGLE_OAUTH_CALLBACK_TITLE;
  renderMessage();
  notifyCallbackPayload(payload);
  return true;
};
