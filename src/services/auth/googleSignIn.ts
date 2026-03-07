import platform from "@/platform";
import { isDesktopRuntime } from "@/platform/runtime";
import { auth } from "@/services/firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";

const DESKTOP_REDIRECT_URI = "manifolia://auth/callback";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALLBACK_TIMEOUT_MS = 3 * 60 * 1000;

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

const buildAuthorizeUrl = ({
  clientId,
  state,
  codeChallenge,
}: {
  clientId: string;
  state: string;
  codeChallenge: string;
}): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: DESKTOP_REDIRECT_URI,
    response_type: "code",
    scope: getDesktopOauthScope(),
    state,
    prompt: "select_account",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

const parseCallbackUrl = (callbackUrl: string) => {
  const parsed = new URL(callbackUrl);
  if (
    parsed.protocol !== "manifolia:" ||
    parsed.hostname !== "auth" ||
    !parsed.pathname.startsWith("/callback")
  ) {
    throw new Error("Unexpected callback URL");
  }

  const hashParams = new URLSearchParams(
    parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
  );
  const getParam = (name: string): string | null =>
    parsed.searchParams.get(name) ?? hashParams.get(name);

  return {
    code: getParam("code"),
    state: getParam("state"),
    error: getParam("error"),
    errorDescription: getParam("error_description"),
  };
};

const waitForDesktopOAuthCode = (expectedState: string): Promise<string> => {
  if (
    typeof window === "undefined" ||
    !window.desktop?.oauth ||
    typeof window.desktop.oauth.onCallback !== "function"
  ) {
    throw new Error("Desktop OAuth callback API is not available");
  }

  return new Promise<string>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for desktop OAuth callback"));
    }, CALLBACK_TIMEOUT_MS);

    const unsubscribe = window.desktop.oauth.onCallback((callbackUrl) => {
      const parsed = parseCallbackUrl(callbackUrl);
      if (parsed.state !== expectedState) {
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
}: {
  clientId: string;
  code: string;
  codeVerifier: string;
}): Promise<string> => {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      redirect_uri: DESKTOP_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    }),
  });

  const payload = (await response.json()) as {
    error?: string;
    error_description?: string;
    id_token?: string;
  };

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google token exchange failed (${response.status})`,
    );
  }

  if (!payload.id_token) {
    throw new Error("Google token exchange did not return id_token");
  }

  return payload.id_token;
};

const signInWithGoogleDesktop = async (): Promise<void> => {
  const clientId = getDesktopOauthClientId();
  const state = randomBase64Url(16);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authorizeUrl = buildAuthorizeUrl({ clientId, state, codeChallenge });

  const codePromise = waitForDesktopOAuthCode(state);
  await platform.shell.openExternal(authorizeUrl);
  const code = await codePromise;

  const idToken = await exchangeCodeForIdToken({
    clientId,
    code,
    codeVerifier,
  });

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
};

const signInWithGoogleWeb = async (): Promise<void> => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

export const signInWithGoogle = async (): Promise<void> => {
  if (isDesktopRuntime()) {
    await signInWithGoogleDesktop();
    return;
  }
  await signInWithGoogleWeb();
};
