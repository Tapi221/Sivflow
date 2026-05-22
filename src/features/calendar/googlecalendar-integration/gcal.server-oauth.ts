import { httpsCallable } from "firebase/functions";

import { functionsClient } from "@/services/firebase";

type ServerGoogleCalendarAccess = {
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

export const isServerStoredGoogleOAuthEnabled = (): boolean => {
  return import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true";
};

export const exchangeGoogleCalendarCode = async (
  input: ExchangeGoogleCalendarCodeInput,
): Promise<ServerGoogleCalendarAccess> => {
  const result = await exchangeGoogleCalendarCodeCallable(input);
  return result.data;
};

export const getServerStoredGoogleCalendarAccessToken = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  const result = await getGoogleCalendarAccessTokenCallable(input);
  return result.data;
};

export const disconnectServerStoredGoogleCalendarAccount = async (
  input: DisconnectGoogleCalendarAccountInput,
): Promise<void> => {
  await disconnectGoogleCalendarAccountCallable(input);
};
