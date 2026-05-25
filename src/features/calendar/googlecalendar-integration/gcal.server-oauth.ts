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
  forceRefreshToken?: boolean;
  redirectUri: string;
};

type GetGoogleCalendarAccessTokenInput = {
  accountId: string;
};

type DisconnectGoogleCalendarAccountInput = {
  accountId: string;
};

type GoogleOAuthReconnectDiagnosis = {
  cause: string;
  reconnectRequired: boolean;
  action: string;
};

const exchangeGoogleCalendarCodeCallable = httpsCallable<ExchangeGoogleCalendarCodeInput, ServerGoogleCalendarAccess>(functionsClient, "exchangeGoogleCalendarCode");
const getGoogleCalendarAccessTokenCallable = httpsCallable<GetGoogleCalendarAccessTokenInput, ServerGoogleCalendarAccess>(functionsClient, "getGoogleCalendarAccessToken");
const disconnectGoogleCalendarAccountCallable = httpsCallable<DisconnectGoogleCalendarAccountInput, { ok: boolean }>(functionsClient, "disconnectGoogleCalendarAccount");

const AUTO_RECOVERY_PENDING_ERROR_CODE = "auto-recovery-pending";
const AUTO_RECOVERY_PENDING_MESSAGE = "Google Calendar の自動復旧を待機中です。しばらくしてからもう一度同期します。";
const SERVER_TOKEN_RETRY_DELAYS_MS = [500, 1_500] as const;

const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase authentication is required for Google Calendar sync");
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeCallableErrorCode = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return (error as Error & { code?: string }).code?.replace(/^functions\//, "");
  }

  return undefined;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const maskAccountId = (accountId?: string): string | undefined => {
  if (!accountId) return undefined;

  const [localPart, domain] = accountId.split("@", 2);
  if (!domain) return accountId;

  return `${localPart.slice(0, 2)}***@${domain}`;
};

const diagnoseGoogleOAuthReconnectCause = (
  error: unknown,
): GoogleOAuthReconnectDiagnosis => {
  const code = normalizeCallableErrorCode(error);
  const message = toErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (code === "unauthenticated" || normalizedMessage.includes("firebase authentication")) {
    return {
      cause: "Firebase 未認証のため Cloud Functions で refresh token を取得できません。",
      reconnectRequired: false,
      action: "Firebase Auth のログイン状態が戻った後に自動リトライします。",
    };
  }

  if (code === "not-found") {
    return {
      cause: "Firestore に保存済み Google OAuth アカウントが見つかりません。",
      reconnectRequired: false,
      action: "ユーザーに popup を出さず、サーバー保存状態の復旧を待ちます。",
    };
  }

  if (
    normalizedMessage.includes("stored refresh token is missing") ||
    normalizedMessage.includes("refresh token missing") ||
    normalizedMessage.includes("no stored refresh token")
  ) {
    return {
      cause: "保存済み refresh token が欠落しています。",
      reconnectRequired: false,
      action: "ユーザーに popup を出さず、バックグラウンド復旧待ちにします。",
    };
  }

  if (normalizedMessage.includes("invalid_grant")) {
    return {
      cause: "Google 側で refresh token が無効化されています。権限取り消し、期限切れ、または認可コードの再利用が考えられます。",
      reconnectRequired: false,
      action: "ユーザーに popup を出さず、運用側ログで原因を確認します。",
    };
  }

  if (
    normalizedMessage.includes("invalid_client") ||
    normalizedMessage.includes("unauthorized_client")
  ) {
    return {
      cause: "OAuth client ID / client secret が一致していません。",
      reconnectRequired: false,
      action: "ユーザー操作ではなく Firebase Functions secrets と Google Cloud Console の OAuth Web client 設定を修正してください。",
    };
  }

  if (
    normalizedMessage.includes("encryption") ||
    normalizedMessage.includes("decrypt") ||
    normalizedMessage.includes("invalid encrypted refresh token") ||
    normalizedMessage.includes("unable to authenticate data") ||
    normalizedMessage.includes("google_oauth_token_encryption_key")
  ) {
    return {
      cause: "暗号化キー不一致、または保存済み refresh token の暗号化データ破損が疑われます。",
      reconnectRequired: false,
      action: "ユーザーに popup を出さず、サーバー側の保存状態は運用側で確認します。",
    };
  }

  if (code === "permission-denied") {
    return {
      cause: "Cloud Functions / Firestore の権限不足で refresh token を取得できません。",
      reconnectRequired: false,
      action: "ユーザー操作ではなく Firebase Auth、Functions、Firestore ルール/権限を確認してください。",
    };
  }

  if (isServerInfrastructureError(error)) {
    return {
      cause: "Cloud Functions の一時障害または制限により refresh token 更新に失敗しました。",
      reconnectRequired: false,
      action: "サーバーリトライまたは後続リトライで復旧します。自動復旧では popup を開きません。",
    };
  }

  return {
    cause: "Google OAuth refresh token 更新に失敗しました。原因は未分類です。",
    reconnectRequired: false,
    action: "再連携状態へ落とさず、ログと Functions / Firestore の状態を確認してください。",
  };
};

const logGoogleOAuthReconnectCause = ({
  context,
  error,
  accountId,
}: {
  context: string;
  error: unknown;
  accountId?: string;
}): void => {
  const diagnosis = diagnoseGoogleOAuthReconnectCause(error);

  console.warn("[GoogleCalendarOAuth] reconnect diagnosis", {
    context,
    accountId: maskAccountId(accountId),
    code: normalizeCallableErrorCode(error),
    cause: diagnosis.cause,
    reconnectRequired: diagnosis.reconnectRequired,
    action: diagnosis.action,
    error,
  });
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

const toUserTransparentAutoRecoveryError = (_error: unknown): Error => {
  const error = new Error(AUTO_RECOVERY_PENDING_MESSAGE);
  (error as Error & { code?: string }).code = AUTO_RECOVERY_PENDING_ERROR_CODE;
  return error;
};

const getGoogleCalendarAccessTokenWithRetry = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  for (let attempt = 0; attempt <= SERVER_TOKEN_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await getGoogleCalendarAccessTokenCallable(input);
      return result.data;
    } catch (error) {
      if (
        !isServerInfrastructureError(error) ||
        attempt >= SERVER_TOKEN_RETRY_DELAYS_MS.length
      ) {
        throw error;
      }

      await sleep(SERVER_TOKEN_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("Google Calendar server token refresh retry loop exhausted");
};

export const isServerStoredGoogleOAuthEnabled = (): boolean => {
  if (isDesktopLikeRuntime()) {
    return false;
  }

  // Web / 非 Desktop では refresh token を localStorage に保存しない。
  // VITE_GOOGLE_OAUTH_SERVER_TOKENS=true の場合は Cloud Functions 側の
  // refresh token 保存を第一候補にする。自動復旧では Google Identity Services の
  // token client を呼ばず、ユーザーに見える popup を開かない。
  return import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true";
};

export const exchangeGoogleCalendarCode = async (
  input: ExchangeGoogleCalendarCodeInput,
): Promise<ServerGoogleCalendarAccess> => {
  try {
    await waitForCallableAuth();

    // 初回接続/明示再接続では必ずサーバーに refresh token を保存させる。
    // ここで access token だけにフォールバックすると、期限切れ後に再連携が必要になる。
    const result = await exchangeGoogleCalendarCodeCallable(input);
    return result.data;
  } catch (error) {
    logGoogleOAuthReconnectCause({
      context: "exchangeGoogleCalendarCode",
      error,
    });
    throw error;
  }
};

export const getServerStoredGoogleCalendarAccessToken = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  try {
    await waitForCallableAuth();

    return await getGoogleCalendarAccessTokenWithRetry(input);
  } catch (error) {
    logGoogleOAuthReconnectCause({
      context: "getServerStoredGoogleCalendarAccessToken",
      error,
      accountId: input.accountId,
    });

    // Google Identity Services の token client は prompt=none でもブラウザや状態によって
    // 一瞬 popup/window を開くことがあるため、自動復旧では呼ばない。
    throw toUserTransparentAutoRecoveryError(error);
  }
};

export const disconnectServerStoredGoogleCalendarAccount = async (
  input: DisconnectGoogleCalendarAccountInput,
): Promise<void> => {
  await waitForCallableAuth();
  await disconnectGoogleCalendarAccountCallable(input);
};
