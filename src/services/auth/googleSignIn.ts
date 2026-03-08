import { getDesktopOauthApi } from "@/platform/desktop/bridge";
import { isDesktopRuntime } from "@/platform/runtime";
import { auth } from "@/services/firebase";
import type { DesktopOauthCallbackPayload } from "@/types/desktop-api";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";

const DEFAULT_DESKTOP_REDIRECT_URI =
  "http://127.0.0.1:42813/auth/google/callback";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

const isElectronRendererRuntime = (): boolean =>
  typeof navigator !== "undefined" && /Electron\/\d+/i.test(navigator.userAgent);

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (value) =>
    String.fromCharCode(value),
  ).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const randomBase64Url = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const createCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
};

const getDesktopOauthClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("Desktop Google OAuth client ID is not configured");
  }
  return clientId;
};

const getDesktopOauthScope = (): string =>
  import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_SCOPE || "openid email profile";

const getDesktopRedirectUri = (): string => {
  const configuredUri = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configuredUri) {
    return configuredUri;
  }
  return DEFAULT_DESKTOP_REDIRECT_URI;
};

const buildAuthorizeUrl = ({
  clientId,
  state,
  codeChallenge,
  redirectUri,
}: {
  clientId: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getDesktopOauthScope(),
    state,
    prompt: "select_account",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

const logDesktopAuthorizeRequest = (authorizeUrl: string): void => {
  try {
    const parsed = new URL(authorizeUrl);
    const params = parsed.searchParams;
    console.info("[auth][desktop-oauth] authorize request", {
      client_id: params.get("client_id"),
      redirect_uri: params.get("redirect_uri"),
      response_type: params.get("response_type"),
      scope: params.get("scope"),
      code_challenge_method: params.get("code_challenge_method"),
    });
  } catch (error) {
    console.warn("[auth][desktop-oauth] failed to parse authorize URL", error);
  }
};

const toRedirectTarget = (rawUri: string): { protocol: string; host: string; pathname: string } => {
  const parsed = new URL(rawUri);
  return {
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname || "/",
  };
};

const parseLoopbackCallback = (
  payload: DesktopOauthCallbackPayload,
  redirectUri: string,
) => {
  const parsed = new URL(payload.url);
  const callbackTarget = toRedirectTarget(payload.url);
  const expectedTarget = toRedirectTarget(redirectUri);
  if (
    callbackTarget.protocol !== expectedTarget.protocol ||
    callbackTarget.host !== expectedTarget.host ||
    callbackTarget.pathname !== expectedTarget.pathname
  ) {
    throw new Error("Unexpected callback URL");
  }

  const getParam = (name: string): string | null =>
    parsed.searchParams.get(name);

  return {
    code: payload.code ?? getParam("code"),
    state: payload.state ?? getParam("state"),
    error: payload.error ?? getParam("error"),
    errorDescription:
      payload.errorDescription ?? getParam("error_description"),
  };
};

const waitForDesktopOAuthCode = (
  expectedState: string,
  redirectUri: string,
): Promise<string> => {
  const desktopOauth = getDesktopOauthApi();

  return new Promise<string>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for desktop OAuth callback"));
    }, CALLBACK_TIMEOUT_MS);

    const unsubscribe = desktopOauth.onCallback((payload) => {
      const parsed = parseLoopbackCallback(payload, redirectUri);
      const isStateMatched = parsed.state === expectedState;
      console.info("[auth][desktop-oauth] callback state check", {
        expectedState,
        receivedState: parsed.state,
        matched: isStateMatched,
      });
      if (!isStateMatched) {
        return;
      }

      window.clearTimeout(timeoutId);
      unsubscribe();

      if (parsed.error) {
        reject(
          new Error(
            parsed.errorDescription || `Google OAuth failed: ${parsed.error}`,
          ),
        );
        return;
      }

      if (!parsed.code) {
        reject(new Error("Google OAuth callback does not include auth code"));
        return;
      }

      resolve(parsed.code);
    });
  });
};

const exchangeCodeForIdToken = async ({
  clientId,
  code,
  codeVerifier,
  redirectUri,
}: {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<string> => {
  const envClientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const expectedLoopbackRedirectUri = "http://127.0.0.1:42813/auth/google/callback";
  console.info("[auth][desktop-oauth] token exchange request", {
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier_length: codeVerifier.length,
    body_keys: [
      "client_id",
      "client_secret",
      "code",
      "code_verifier",
      "grant_type",
      "redirect_uri",
    ],
    client_id_matches_env:
      typeof envClientId === "string" && clientId === envClientId,
    redirect_uri_matches_expected: redirectUri === expectedLoopbackRedirectUri,
  });

  const desktopOauth = getDesktopOauthApi();
  const idToken = await desktopOauth.exchangeIdToken({
    clientId,
    code,
    codeVerifier,
    redirectUri,
  });
  return idToken;
};

const signInWithGoogleDesktop = async (): Promise<void> => {
  const desktopOauth = getDesktopOauthApi();
  const clientId = getDesktopOauthClientId();
  const redirectUri = getDesktopRedirectUri();
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    state,
    codeChallenge,
    redirectUri,
  });
  logDesktopAuthorizeRequest(authorizeUrl);

  const codePromise = waitForDesktopOAuthCode(state, redirectUri);
  try {
    await desktopOauth.start(authorizeUrl);
    const code = await codePromise;

    const idToken = await exchangeCodeForIdToken({
      clientId,
      code,
      codeVerifier,
      redirectUri,
    });

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  } catch (error) {
    await desktopOauth.cancel().catch(() => undefined);
    throw error;
  }
};

const signInWithGoogleWeb = async (): Promise<void> => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

export const signInWithGoogle = async (): Promise<void> => {
  if (isDesktopRuntime() || isElectronRendererRuntime()) {
    await signInWithGoogleDesktop();
    return;
  }
  await signInWithGoogleWeb();
};




