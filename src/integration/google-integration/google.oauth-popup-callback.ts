export type GoogleOAuthPopupCallbackPayload = {
  type: "flashcard-master:google-oauth-popup-callback";
  url: string;
  state: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
};

const GOOGLE_OAUTH_POPUP_CALLBACK_MESSAGE_TYPE = "flashcard-master:google-oauth-popup-callback";
const GOOGLE_OAUTH_POPUP_CALLBACK_TITLE = "Google 連携を完了しています";
const GOOGLE_OAUTH_POPUP_CALLBACK_DESCRIPTION = "元の画面で処理を続行します。";

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
  title.textContent = GOOGLE_OAUTH_POPUP_CALLBACK_TITLE;

  const description = document.createElement("p");
  description.style.fontSize = "14px";
  description.style.margin = "0";
  description.textContent = GOOGLE_OAUTH_POPUP_CALLBACK_DESCRIPTION;

  main.append(title, description);
  root.replaceChildren(main);
};

const postCallbackPayloadToOpener = (payload: GoogleOAuthPopupCallbackPayload): void => {
  if (!window.opener) return;
  window.opener.postMessage(payload, window.location.origin);
};

export const createGoogleOAuthPopupCallbackPayload = (url: URL): GoogleOAuthPopupCallbackPayload | null => {
  if (!hasGoogleOAuthCallbackResult(url)) return null;
  return {
    type: GOOGLE_OAUTH_POPUP_CALLBACK_MESSAGE_TYPE,
    url: url.href,
    state: url.searchParams.get("state"),
    code: url.searchParams.get("code"),
    error: url.searchParams.get("error"),
    errorDescription: url.searchParams.get("error_description"),
  };
};

export const isGoogleOAuthPopupCallbackPayload = (value: unknown): value is GoogleOAuthPopupCallbackPayload => {
  if (!isRecord(value)) return false;
  return value.type === GOOGLE_OAUTH_POPUP_CALLBACK_MESSAGE_TYPE && typeof value.url === "string" && isNullableString(value.state) && isNullableString(value.code) && isNullableString(value.error) && isNullableString(value.errorDescription);
};

export const renderGoogleOAuthPopupCallback = (): boolean => {
  if (typeof window === "undefined") return false;
  const payload = createGoogleOAuthPopupCallbackPayload(new URL(window.location.href));
  if (!payload) return false;
  document.title = GOOGLE_OAUTH_POPUP_CALLBACK_TITLE;
  renderMessage();
  postCallbackPayloadToOpener(payload);
  return true;
};
