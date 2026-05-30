import { DESKTOP_GOOGLE_OAUTH_REDIRECT_URI } from "@constants/desktop/app";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { auth } from "@/infrastructure/firebase/client";
import platform from "../../index";
import type { DesktopOauthCallbackPayload } from "../../desktopApi";

const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const CALLBACK_TIMEOUT_MS = 30 * 1000;

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

const getDesktopOauthScope = (): string => {
  return (
    import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_SCOPE || "openid email profile"
  );
};

const getDesktopRedirectUri = (): string => {
  const configuredUri =
    import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?.trim();

  if (configuredUri && configuredUri !== DESKTOP_GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error(
      `Desktop OAuth redirect URI mismatch. expected=${DESKTOP_GOOGLE_OAUTH_REDIRECT_URI}, actual=${configuredUri}`,
    );
  }

  return DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;
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

const toRedirectTarget = (rawUri: string) => {
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
    errorDescription: payload.errorDescription ?? getParam("error_description"),
  };
};

const waitForDesktopOAuthCode = (
  expectedState: string,
  redirectUri: string,
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    let isSettled = false;

    const timeoutId = window.setTimeout(() => {
      unsubscribe?.();
      isSettled = true;
      reject(new Error("Timed out waiting for desktop OAuth callback"));
    }, CALLBACK_TIMEOUT_MS);

    const cleanup = (): void => {
      window.clearTimeout(timeoutId);
      isSettled = true;
      unsubscribe?.();
    };

    const handlePayload = (payload: DesktopOauthCallbackPayload): void => {
      if (isSettled) return;

      const parsed = parseLoopbackCallback(payload, redirectUri);
      const isStateMatched = parsed.state === expectedState;

      if (!isStateMatched) {
        return;
      }

      cleanup();

      if (parsed.error) {
        reject(
          new Error(
            parsed.errorDescription || `Google OAuth failed: ${parsed.error}`,
          ),
        );
        return;
      }

      const code = parsed.code;

      if (!code) {
        reject(new Error("Google OAuth callback does not include auth code"));
        return;
      }

      resolve(code);
    };

    const pollPendingCallback = async (): Promise<void> => {
      if (isSettled) return;

      try {
        const pendingPayload = await oauthBridge.takePendingCallback();
        if (pendingPayload) {
          handlePayload(pendingPayload);
        }
      } catch {
        // Event delivery is the primary path; polling only covers early callback races.
      }
    };

    const pendingPollId = window.setInterval(() => {
      void pollPendingCallback();
    }, 250);

    const stopPendingPolling = (): void => {
      window.clearInterval(pendingPollId);
    };

    unsubscribe = oauthBridge.onCallback(handlePayload);

    void pollPendingCallback();

    const currentUnsubscribe = unsubscribe;
    unsubscribe = () => {
      stopPendingPolling();
      currentUnsubscribe?.();
    };
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
  return await platform.oauth.exchangeIdToken({
    clientId,
    code,
    codeVerifier,
    redirectUri,
  });
};

const signIn: GoogleAuthPort["signIn"] = async () => {
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

  const codePromise = waitForDesktopOAuthCode(state, redirectUri);

  try {
    await platform.oauth.start(authorizeUrl);
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
    await platform.oauth.cancel().catch(() => undefined);
    throw error;
  }
};

export const googleAuthDesktopAdapter: GoogleAuthPort = {
  signIn,
};