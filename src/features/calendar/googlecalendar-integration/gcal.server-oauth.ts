import type { Auth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth, functionsClient } from "@/services/firebase";

import type { GoogleCalendarAccess } from "./gcal.oauth";

type ServerGoogleCalendarAccess = GoogleCalendarAccess & {
  accessToken: string;
  accountEmail: string | null;
  accountName: string | null;
  accountPhotoUrl: string | null;
  expiresInSeconds?: number | null;
  refreshTokenStored?: boolean;
};

type ExchangeGoogleCalendarCodeInput = {
  code: string;
  redirectUri: string;
};

type GetGoogleCalendarAccessTokenInput = {
  accountId: string;
};

type DisconnectGoogleCalendarAccountInput = {
  accountId: string;
};

type RequestCalendarAccessToken = (
  auth: Auth,
  silent?: boolean,
) => Promise<GoogleCalendarAccess>;

const exchangeGoogleCalendarCodeCallable = httpsCallable<
  ExchangeGoogleCalendarCodeInput,
  ServerGoogleCalendarAccess
>(functionsClient, "exchangeGoogleCalendarCode");

const getGoogleCalendarAccessTokenCallable = httpsCallable<
  GetGoogleCalendarAccessTokenInput,
  ServerGoogleCalendarAccess
>(functionsClient, "getGoogleCalendarAccessToken");

const disconnectGoogleCalendarAccountCallable = httpsCallable<
  DisconnectGoogleCalendarAccountInput,
  { ok: boolean }
>(functionsClient, "disconnectGoogleCalendarAccount");

const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase authentication is required for Google Calendar sync");
  }
};

const normalizeCallableErrorCode = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return (error as Error & { code?: string }).code?.replace(/^functions\//, "");
  }

  return undefined;
};

const isServerInfrastructureError = (error: unknown): boolean => {
  const code = normalizeCallableErrorCode(error);

  return (
    code === "internal" ||
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "resource-exhausted"
  );
};

const isRecoverableServerOAuthStateError = (error: unknown): boolean => {
  const code = normalizeCallableErrorCode(error);

  return code === "failed-precondition" || code === "not-found";
};

const canUseSilentBrowserTokenFallback = (): boolean => {
  return Boolean(import.meta.env.VITE_WEB_GOOGLE_OAUTH_CLIENT_ID);
};

const shouldFallbackToSilentBrowserToken = (error: unknown): boolean => {
  if (!canUseSilentBrowserTokenFallback()) return false;

  return isServerInfrastructureError(error) || isRecoverableServerOAuthStateError(error);
};

const requestSilentBrowserCalendarAccessToken = async (): Promise<GoogleCalendarAccess> => {
  const oauthModule = await import("./gcal.oauth") as {
    requestCalendarAccessToken?: RequestCalendarAccessToken;
  };

  if (typeof oauthModule.requestCalendarAccessToken !== "function") {
    throw new Error("Google Calendar browser OAuth fallback is unavailable");
  }

  // VITE_WEB_GOOGLE_OAUTH_CLIENT_ID が存在する場合だけ呼ぶため、
  // gcal.oauth.ts 側では GIS の prompt=none 経路になり、popup を開かない。
  return oauthModule.requestCalendarAccessToken(auth, true);
};

export const isServerStoredGoogleOAuthEnabled = (): boolean => {
  if (isDesktopLikeRuntime()) {
    return false;
  }

  // Web / 非 Desktop では refresh token を localStorage に保存しない。
  // VITE_GOOGLE_OAUTH_SERVER_TOKENS=true の場合は Cloud Functions 側の
  // refresh token 保存を第一候補にする。更新に失敗した場合は、popup を使わない
  // GIS silent access token だけを一時的なフォールバックとして使う。
  return import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true";
};

export const exchangeGoogleCalendarCode = async (
  input: ExchangeGoogleCalendarCodeInput,
): Promise<ServerGoogleCalendarAccess> => {
  await waitForCallableAuth();

  // 初回接続/明示再接続では必ずサーバーに refresh token を保存させる。
  // ここで access token だけにフォールバックすると、期限切れ後に再連携が必要になる。
  const result = await exchangeGoogleCalendarCodeCallable(input);
  return result.data;
};

export const getServerStoredGoogleCalendarAccessToken = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  await waitForCallableAuth();

  try {
    const result = await getGoogleCalendarAccessTokenCallable(input);
    return result.data;
  } catch (error) {
    if (!shouldFallbackToSilentBrowserToken(error)) {
      throw error;
    }

    console.warn(
      "[GoogleCalendarOAuth] server token refresh failed; using non-popup silent browser token fallback",
      error,
    );

    try {
      const access = await requestSilentBrowserCalendarAccessToken();
      return {
        ...access,
        accountEmail: access.accountEmail ?? input.accountId,
        refreshTokenStored: false,
      };
    } catch (fallbackError) {
      console.warn(
        "[GoogleCalendarOAuth] silent browser token fallback failed",
        fallbackError,
      );

      throw error;
    }
  }
};

export const disconnectServerStoredGoogleCalendarAccount = async (
  input: DisconnectGoogleCalendarAccountInput,
): Promise<void> => {
  await waitForCallableAuth();
  await disconnectGoogleCalendarAccountCallable(input);
};
