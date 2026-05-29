import { httpsCallable } from "firebase/functions";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";
import { auth, functionsClient } from "@/services/firebase";
import { consumeGoogleCalendarServerCodeVerifier, type GoogleCalendarAccess } from "./google.oauth";

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
  codeVerifier?: string;
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

export type GoogleOAuthCallableErrorReason =
  | "invalid_grant"
  | "server_oauth_configuration"
  | "token_encryption_key_invalid"
  | "stored_refresh_token_decrypt_failed"
  | "stored_refresh_token_missing"
  | "insufficient_google_scope"
  | "token_endpoint_failed";

type CallableErrorDetails = {
  reason?: GoogleOAuthCallableErrorReason;
  reconnectRequired?: boolean;
  userAction?: string;
  adminAction?: string;
};

const exchangeGoogleCalendarCodeCallable = httpsCallable<ExchangeGoogleCalendarCodeInput, ServerGoogleCalendarAccess>(functionsClient, "exchangeGoogleCalendarCode");
const getGoogleCalendarAccessTokenCallable = httpsCallable<GetGoogleCalendarAccessTokenInput, ServerGoogleCalendarAccess>(functionsClient, "getGoogleCalendarAccessToken");
const disconnectGoogleCalendarAccountCallable = httpsCallable<DisconnectGoogleCalendarAccountInput, { ok: boolean }>(functionsClient, "disconnectGoogleCalendarAccount");

const AUTO_RECOVERY_PENDING_ERROR_CODE = "auto-recovery-pending";
const AUTO_RECOVERY_PENDING_MESSAGE = "Google Calendar の自動復旧を待機中です。しばらくしてからもう一度同期します。";
const SERVER_OAUTH_CONFIGURATION_ERROR_CODE = "server-oauth-configuration-error";
const SERVER_OAUTH_CONFIGURATION_ERROR_MESSAGE = "Google OAuth のサーバー設定に問題があります。管理者は Firebase Functions secrets の GOOGLE_OAUTH_WEB_CLIENT_ID / GOOGLE_OAUTH_WEB_CLIENT_SECRET を、Google Cloud Console に存在する有効なウェブアプリ OAuth クライアントの値に更新して、Functions を再デプロイしてください。";
const INVALID_REFRESH_TOKEN_ERROR_CODE = "google-refresh-token-invalid";
const INVALID_REFRESH_TOKEN_MESSAGE = "Google 連携トークンが無効です。Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。";
const INSUFFICIENT_GOOGLE_SCOPE_ERROR_CODE = "google-scope-insufficient";
const INSUFFICIENT_GOOGLE_SCOPE_MESSAGE = "Google Calendar と Google Tasks の権限が不足しています。Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。";
const SERVER_TOKEN_DECRYPT_ERROR_CODE = "server-stored-token-decrypt-error";
const SERVER_TOKEN_DECRYPT_ERROR_MESSAGE = "保存済み Google 連携トークンを復号できません。管理者が暗号化キーと保存データを確認してください。";
const SERVER_TOKEN_RETRY_DELAYS_MS = [500, 1_500] as const;

const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase 認証が必要です。ログイン状態を確認してください。");
  }
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeCallableErrorCode = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return (error as Error & { code?: string }).code?.replace(/^functions\//, "");
  }

  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readGoogleOAuthCallableErrorDetails = (error: unknown): CallableErrorDetails => {
  if (!isRecord(error)) return {};
  const details = error.details;
  if (!isRecord(details)) return {};

  return {
    reason: typeof details.reason === "string" ? details.reason as GoogleOAuthCallableErrorReason : undefined,
    reconnectRequired: typeof details.reconnectRequired === "boolean" ? details.reconnectRequired : undefined,
    userAction: typeof details.userAction === "string" ? details.userAction : undefined,
    adminAction: typeof details.adminAction === "string" ? details.adminAction : undefined,
  };
};

export const getGoogleOAuthCallableErrorReason = (error: unknown): GoogleOAuthCallableErrorReason | undefined =>
  readGoogleOAuthCallableErrorDetails(error).reason;

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

const isOAuthClientConfigurationError = (error: unknown): boolean => {
  const normalizedMessage = toErrorMessage(error).toLowerCase();

  return (
    normalizedMessage.includes("invalid_client") ||
    normalizedMessage.includes("unauthorized_client") ||
    normalizedMessage.includes("oauth client was not found") ||
    normalizedMessage.includes("client was not found")
  );
};

const isInvalidRefreshTokenError = (error: unknown): boolean => {
  const normalizedMessage = toErrorMessage(error).toLowerCase();
  return normalizedMessage.includes("invalid_grant");
};

export const diagnoseGoogleOAuthReconnectCause = (error: unknown): GoogleOAuthReconnectDiagnosis => {
  const code = normalizeCallableErrorCode(error);
  const details = readGoogleOAuthCallableErrorDetails(error);
  const reason = details.reason;
  const message = toErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (reason === "invalid_grant") {
    return {
      cause: "Google 側で refresh token または認可コードが無効化されています。権限取り消し、期限切れ、または認可コードの再利用が考えられます。",
      reconnectRequired: true,
      action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。",
    };
  }

  if (reason === "stored_refresh_token_missing") {
    return {
      cause: "保存済み refresh token が欠落しています。",
      reconnectRequired: true,
      action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。",
    };
  }

  if (reason === "insufficient_google_scope") {
    return {
      cause: "保存済み Google OAuth トークンに Calendar と Tasks の両方の権限がありません。",
      reconnectRequired: true,
      action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、Calendar と Tasks の両方を許可して再連携してください。",
    };
  }

  if (reason === "server_oauth_configuration") {
    return {
      cause: "Cloud Functions の OAuth Web Client ID / Client Secret が Google Cloud Console の有効なウェブアプリ OAuth クライアントと一致していません。",
      reconnectRequired: false,
      action: details.adminAction ?? "ユーザー操作では直りません。Firebase Functions secrets の GOOGLE_OAUTH_WEB_CLIENT_ID / GOOGLE_OAUTH_WEB_CLIENT_SECRET を正しい値に更新し、Functions を再デプロイしてください。",
    };
  }

  if (reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed") {
    return {
      cause: "暗号化キー不一致、または保存済み refresh token の暗号化データ破損が疑われます。",
      reconnectRequired: false,
      action: "ユーザー操作では直りません。GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY と Firestore の保存済み refresh token を確認してください。",
    };
  }

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
      action: "画面から Google アカウントを再連携してください。",
    };
  }

  if (normalizedMessage.includes("stored refresh token is missing") || normalizedMessage.includes("refresh token missing") || normalizedMessage.includes("no stored refresh token")) {
    return {
      cause: "保存済み refresh token が欠落しています。",
      reconnectRequired: true,
      action: "画面から Google アカウントを再連携してください。",
    };
  }

  if (isInvalidRefreshTokenError(error)) {
    return {
      cause: "Google 側で refresh token が無効化されています。権限取り消し、期限切れ、または認可コードの再利用が考えられます。",
      reconnectRequired: true,
      action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。",
    };
  }

  if (isOAuthClientConfigurationError(error)) {
    return {
      cause: "Cloud Functions の OAuth Web Client ID / Client Secret が Google Cloud Console の有効なウェブアプリ OAuth クライアントと一致していません。",
      reconnectRequired: false,
      action: "ユーザー操作では直りません。Firebase Functions secrets の GOOGLE_OAUTH_WEB_CLIENT_ID / GOOGLE_OAUTH_WEB_CLIENT_SECRET を正しい値に更新し、Functions を再デプロイしてください。",
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
      action: "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY と Firestore の保存済み refresh token を確認してください。",
    };
  }

  if (code === "permission-denied") {
    return {
      cause: "Cloud Functions / Firestore の権限不足で refresh token を取得できません。",
      reconnectRequired: false,
      action: "Firebase Auth、Functions、Firestore ルール/権限を確認してください。",
    };
  }

  if (isServerInfrastructureError(error)) {
    return {
      cause: "Cloud Functions の一時障害または制限により refresh token 更新に失敗しました。",
      reconnectRequired: false,
      action: "サーバーリトライまたは後続リトライで復旧します。繰り返す場合は Functions ログを確認してください。",
    };
  }

  return {
    cause: "Google OAuth refresh token 更新に失敗しました。原因は未分類です。",
    reconnectRequired: false,
    action: "Firebase Functions ログ、Firestore の保存状態、Google Cloud Console の OAuth 設定を確認してください。",
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

  console.warn("[GoogleCalendarOAuth] 再接続診断", {
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

export const isGoogleOAuthDeterministicErrorReason = (reason: string | undefined): boolean =>
  reason === "invalid_grant" ||
  reason === "stored_refresh_token_missing" ||
  reason === "insufficient_google_scope" ||
  reason === "server_oauth_configuration" ||
  reason === "token_encryption_key_invalid" ||
  reason === "stored_refresh_token_decrypt_failed";

const attachGoogleOAuthReason = <T extends Error>(error: T, reason: GoogleOAuthCallableErrorReason | undefined): T => {
  if (reason) {
    (error as T & { googleOAuthReason?: GoogleOAuthCallableErrorReason }).googleOAuthReason = reason;
  }
  return error;
};

export const toUserTransparentAutoRecoveryError = (sourceError: unknown): Error => {
  const reason = getGoogleOAuthCallableErrorReason(sourceError);

  if (reason === "server_oauth_configuration" || isOAuthClientConfigurationError(sourceError)) {
    const error = new Error(SERVER_OAUTH_CONFIGURATION_ERROR_MESSAGE);
    (error as Error & { code?: string }).code = SERVER_OAUTH_CONFIGURATION_ERROR_CODE;
    return attachGoogleOAuthReason(error, reason ?? "server_oauth_configuration");
  }

  if (reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed") {
    const error = new Error(SERVER_TOKEN_DECRYPT_ERROR_MESSAGE);
    (error as Error & { code?: string }).code = SERVER_TOKEN_DECRYPT_ERROR_CODE;
    return attachGoogleOAuthReason(error, reason);
  }

  if (reason === "insufficient_google_scope") {
    const error = new Error(INSUFFICIENT_GOOGLE_SCOPE_MESSAGE);
    (error as Error & { code?: string }).code = INSUFFICIENT_GOOGLE_SCOPE_ERROR_CODE;
    return attachGoogleOAuthReason(error, reason);
  }

  if (reason === "invalid_grant" || reason === "stored_refresh_token_missing" || isInvalidRefreshTokenError(sourceError)) {
    const error = new Error(INVALID_REFRESH_TOKEN_MESSAGE);
    (error as Error & { code?: string }).code = INVALID_REFRESH_TOKEN_ERROR_CODE;
    return attachGoogleOAuthReason(error, reason ?? "invalid_grant");
  }

  const error = new Error(AUTO_RECOVERY_PENDING_MESSAGE);
  (error as Error & { code?: string }).code = AUTO_RECOVERY_PENDING_ERROR_CODE;
  return attachGoogleOAuthReason(error, reason);
};

const getGoogleCalendarAccessTokenWithRetry = async (
  input: GetGoogleCalendarAccessTokenInput,
): Promise<ServerGoogleCalendarAccess> => {
  for (let attempt = 0; attempt <= SERVER_TOKEN_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await getGoogleCalendarAccessTokenCallable(input);
      return result.data;
    } catch (error) {
      if (!isServerInfrastructureError(error) || attempt >= SERVER_TOKEN_RETRY_DELAYS_MS.length) {
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

  if (import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "false") {
    return false;
  }

  return import.meta.env.PROD || import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true";
};

export const exchangeGoogleCalendarCode = async (
  input: ExchangeGoogleCalendarCodeInput,
): Promise<ServerGoogleCalendarAccess> => {
  try {
    await waitForCallableAuth();

    const result = await exchangeGoogleCalendarCodeCallable({
      ...input,
      codeVerifier: input.codeVerifier ?? consumeGoogleCalendarServerCodeVerifier() ?? undefined,
    });
    return result.data;
  } catch (error) {
    logGoogleOAuthReconnectCause({
      context: "exchangeGoogleCalendarCode",
      error,
    });
    throw toUserTransparentAutoRecoveryError(error);
  }
};

export const exchangeGoogleConnectedServiceCode = exchangeGoogleCalendarCode;

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

    throw toUserTransparentAutoRecoveryError(error);
  }
};

export const getServerStoredGoogleConnectedServiceAccessToken = getServerStoredGoogleCalendarAccessToken;

export const disconnectServerStoredGoogleCalendarAccount = async (
  input: DisconnectGoogleCalendarAccountInput,
): Promise<void> => {
  await waitForCallableAuth();
  await disconnectGoogleCalendarAccountCallable(input);
};

export const disconnectServerStoredGoogleConnectedServiceAccount = disconnectServerStoredGoogleCalendarAccount;
