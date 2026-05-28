import { httpsCallable } from "firebase/functions";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth, functionsClient } from "@/services/firebase";

const storeGoogleCalendarDesktopRefreshTokenCallable = httpsCallable<{ refreshToken: string; clientId: string }, { refreshTokenStored: boolean }>(functionsClient, "storeGoogleCalendarDesktopRefreshToken");

const getDesktopClientId = (): string => {
  const clientId = import.meta.env.VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Google OAuth desktop client id");
  return clientId;
};

const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("Firebase 認証が必要です。ログイン状態を確認してください。");
};

export const mirrorDesktopGoogleRefreshTokenToServer = async (refreshToken: string | null | undefined): Promise<void> => {
  if (!isDesktopLikeRuntime() || !refreshToken) return;
  await waitForCallableAuth();
  await storeGoogleCalendarDesktopRefreshTokenCallable({ refreshToken, clientId: getDesktopClientId() });
};
