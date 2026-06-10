import appIconSrc from "@shared/assets/icons/app-icon.svg";

export type GoogleOAuthCallbackPayload = {
  type: "sivflow:google-oauth-callback";
  url: string;
  state: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
};

type StyleDeclarations = Record<string, string>;

export const GOOGLE_OAUTH_CALLBACK_CHANNEL = "sivflow:google-oauth-callback";
export const GOOGLE_OAUTH_CALLBACK_STORAGE_KEY = "sivflow.google-oauth-callback";

const GOOGLE_OAUTH_CALLBACK_TITLE = "Launching Sivflow";
const GOOGLE_OAUTH_CALLBACK_DESCRIPTION = "You will be redirected in a few moments.";
const GOOGLE_OAUTH_CALLBACK_LINK_PREFIX = "If nothing happens, ";
const GOOGLE_OAUTH_CALLBACK_LINK_TEXT = "open Sivflow in your browser";
const GOOGLE_OAUTH_CALLBACK_LINK_SUFFIX = ".";
const GOOGLE_OAUTH_CALLBACK_CLOSE_DELAY_MS = 1200;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

const hasGoogleOAuthCallbackResult = (url: URL): boolean => Boolean(url.searchParams.get("state")) && (url.searchParams.has("code") || url.searchParams.has("error"));

const applyStyles = (element: HTMLElement, styles: StyleDeclarations): void => {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
  }
};

const renderMessage = (): void => {
  const root = document.getElementById("root");
  if (!root) return;

  document.body.style.margin = "0";
  document.body.style.background = "#ffffff";

  const main = document.createElement("main");
  applyStyles(main, {
    "align-items": "center",
    "box-sizing": "border-box",
    "color": "#475569",
    "display": "flex",
    "flex-direction": "column",
    "font-family": "var(--app-font-family-ui), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "justify-content": "center",
    "min-height": "100dvh",
    "padding": "24px",
    "text-align": "center",
  });

  const logoFrame = document.createElement("div");
  applyStyles(logoFrame, {
    "align-items": "center",
    "border-radius": "9999px",
    "display": "flex",
    "height": "176px",
    "justify-content": "center",
    "margin": "0 0 28px",
    "width": "176px",
  });

  const logo = document.createElement("img");
  logo.src = appIconSrc;
  logo.alt = "Sivflow";
  applyStyles(logo, {
    "display": "block",
    "filter": "drop-shadow(0 22px 42px rgba(14, 165, 233, 0.2))",
    "height": "136px",
    "object-fit": "contain",
    "width": "136px",
  });

  const title = document.createElement("h1");
  applyStyles(title, {
    "color": "#334155",
    "font-size": "34px",
    "font-weight": "400",
    "letter-spacing": "-0.03em",
    "line-height": "1.2",
    "margin": "0",
  });
  title.textContent = GOOGLE_OAUTH_CALLBACK_TITLE;

  const description = document.createElement("p");
  applyStyles(description, {
    "color": "#a1a1aa",
    "font-size": "17px",
    "line-height": "1.6",
    "margin": "18px 0 0",
  });
  description.textContent = GOOGLE_OAUTH_CALLBACK_DESCRIPTION;

  const hint = document.createElement("p");
  applyStyles(hint, {
    "color": "#9ca3af",
    "font-size": "15px",
    "line-height": "1.6",
    "margin": "42px 0 0",
  });

  const link = document.createElement("a");
  link.href = window.location.origin;
  link.rel = "noreferrer";
  link.target = "_blank";
  applyStyles(link, {
    "color": "#3b82f6",
    "text-decoration": "none",
  });
  link.textContent = GOOGLE_OAUTH_CALLBACK_LINK_TEXT;

  hint.append(GOOGLE_OAUTH_CALLBACK_LINK_PREFIX, link, GOOGLE_OAUTH_CALLBACK_LINK_SUFFIX);
  logoFrame.append(logo);
  main.append(logoFrame, title, description, hint);
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
  }, GOOGLE_OAUTH_CALLBACK_CLOSE_DELAY_MS);
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
