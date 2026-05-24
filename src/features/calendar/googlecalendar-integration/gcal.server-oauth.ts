import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth, functionsClient } from "@/services/firebase";

import { requestCalendarAccessToken, type GoogleCalendarAccess } from "./gcal.oauth";

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
  if (error instanceof FirebaseError) return error.code.replace(/^functions\//, "");
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

const shouldFallbackExchangeToBrowserToken = (error: unknown): boolean => {
  const code = normalizeCallableErrorCode(error);

  return isServerInfrastructureError(error) || code === "failed-precondition";
};

export const isServerStoredGoogleOAuthEnabled = (): boolean => {
  if (isDesktopLikeRuntime()) {
    return false;
  }

  // Web / 非 Desktop では refresh token を localStorage に保存しない。
  // ただし Functions secrets 未設定などの環境では明示的に true のときだけ
  // Cloud Functions 保存を使い、既定は GIS access token のみにフォールバックする。
  return import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true";
};

export const exchangeGoogleCalendarCode = async (
  input: ExchangeGoogleCalendarCodeInput,
): Promise<ServerGoogleCalendarAccess> => {
  await waitForCallableAuth();

  try {
    const result = await exchangeGoogleCalendarCodeCallable(input);
    return result.data;
  } catch (error) {
    if (!shouldFallbackExchangeToBrowserToken(error)) {
      throw error;
    }

    console.warn(
      "[GoogleCalendarOAuth] server code exchange failed; falling back to browser token",
      error,
    );

    const access = await requestCalendarAccessToken(auth, false);
    return {
      ...access,
      refreshTokenStored: false,
    };
  }
};

export const getServerStoredGoogleCalendarAccessToken = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  await waitForCallableAuth();

  try {
    const result = await getGoogleCalendarAccessTokenCallable(input);
    return result.data;
  } catch (error) {
    if (!isServerInfrastructureError(error)) {
      throw error;
    }

    console.warn(
      "[GoogleCalendarOAuth] server token refresh failed; falling back to silent browser token",
      error,
    );

    const access = await requestCalendarAccessToken(auth, true);
    return {
      ...access,
      accountEmail: access.accountEmail ?? input.accountId,
      refreshTokenStored: false,
    };
  }
};

export const disconnectServerStoredGoogleCalendarAccount = async (
  input: DisconnectGoogleCalendarAccountInput,
): Promise<void> => {
  await waitForCallableAuth();
  await disconnectGoogleCalendarAccountCallable(input);
};