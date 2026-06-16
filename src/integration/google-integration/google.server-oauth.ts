import { auth, functionsClient } from "@platform/firebase/client";
import { httpsCallable } from "firebase/functions";
import type { GoogleCalendarAccess } from "./google.oauth";
import { consumeGoogleCalendarServerCodeVerifier } from "./google.oauth";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";



type GoogleOAuthReconnectDiagnosis = {
  cause: string; reconnectRequired: boolean; action: string; };
type GoogleOAuthCallableErrorReason = "invalid_grant" | "server_oauth_configuration" | "token_encryption_key_invalid" | "stored_refresh_token_decrypt_failed" | "stored_refresh_token_missing" | "insufficient_google_scope" | "token_endpoint_failed";
type CallableErrorDetails = {
  reason?: GoogleOAuthCallableErrorReason; reconnectRequired?: boolean; userAction?: string; adminAction?: string; };
type GoogleOAuthReasonedError = Error & { code?: string; googleOAuthReason?: GoogleOAuthCallableErrorReason; };
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



const AUTO_RECOVERY_PENDING_ERROR_CODE = "auto-recovery-pending";
const AUTO_RECOVERY_PENDING_MESSAGE = "Google 連携の自動復旧を待機中です。しばらくしてからもう一度同期します。";
const SERVER_OAUTH_CONFIGURATION_ERROR_CODE = "server-oauth-configuration-error";
const SERVER_OAUTH_CONFIGURATION_ERROR_MESSAGE = "Google OAuth のサーバー設定に問題があります。管理者は Firebase Functions secrets を確認してください。";
const INVALID_REFRESH_TOKEN_ERROR_CODE = "google-refresh-token-invalid";
const INVALID_REFRESH_TOKEN_MESSAGE = "Google 連携トークンが無効です。Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。";
const INSUFFICIENT_GOOGLE_SCOPE_ERROR_CODE = "google-scope-insufficient";
const INSUFFICIENT_GOOGLE_SCOPE_MESSAGE = "Google Calendar / Google Tasks / Google Drive の権限が不足しています。Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。";
const SERVER_TOKEN_DECRYPT_ERROR_CODE = "server-stored-token-decrypt-error";
const SERVER_TOKEN_DECRYPT_ERROR_MESSAGE = "保存済み Google 連携トークンを復号できません。管理者が暗号化キーと保存データを確認してください。";
const SERVER_TOKEN_RETRY_DELAYS_MS = [500, 1_500] as const;
const exchangeGoogleCalendarCodeCallable =
  httpsCallable<ExchangeGoogleCalendarCodeInput, ServerGoogleCalendarAccess>(
    functionsClient,
    "exchangeGoogleCalendarCode",
  );
const getGoogleCalendarAccessTokenCallable =
  httpsCallable<GetGoogleCalendarAccessTokenInput, ServerGoogleCalendarAccess>(
    functionsClient,
    "getGoogleCalendarAccessToken",
  );
const disconnectGoogleCalendarAccountCallable =
  httpsCallable<DisconnectGoogleCalendarAccountInput, { ok: boolean; }>(
    functionsClient,
    "disconnectGoogleCalendarAccount",
  );



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeCallableErrorCode = (error: unknown): string | undefined => error instanceof Error ? (error as Error & { code?: string; }).code?.replace(/^functions\//, "") : undefined;
const toErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isOAuthClientConfigurationError = (error: unknown): boolean => {
  const normalizedMessage = toErrorMessage(error).toLowerCase();
  return normalizedMessage.includes("invalid_client") || normalizedMessage.includes("unauthorized_client") || normalizedMessage.includes("oauth client was not found") || normalizedMessage.includes("client was not found");
};
const isInvalidRefreshTokenError = (error: unknown): boolean => toErrorMessage(error).toLowerCase().includes("invalid_grant");
const isServerInfrastructureError = (error: unknown): boolean => {
  const code = normalizeCallableErrorCode(error);
  return code === "internal" || code === "unavailable" || code === "deadline-exceeded" || code === "resource-exhausted";
};
const createGoogleOAuthError = (message: string, code: string, reason?: GoogleOAuthCallableErrorReason): Error => {
  const error = new Error(message) as GoogleOAuthReasonedError;
  error.code = code;
  if (reason) error.googleOAuthReason = reason;
  return error;
};
const waitForCallableAuth = async (): Promise<void> => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Firebase 認証が必要です。ログイン状態を確認してください。");
  }
};
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
const readGoogleOAuthCallableErrorDetails = (error: unknown): CallableErrorDetails => {
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
const getGoogleOAuthCallableErrorReason = (error: unknown): GoogleOAuthCallableErrorReason | undefined => {
  const wrappedReason = error instanceof Error ? (error as GoogleOAuthReasonedError).googleOAuthReason : undefined;
  return wrappedReason ?? readGoogleOAuthCallableErrorDetails(error).reason;
};
const diagnoseGoogleOAuthReconnectCause = (error: unknown): GoogleOAuthReconnectDiagnosis => {
  const code = normalizeCallableErrorCode(error);
  const details = readGoogleOAuthCallableErrorDetails(error);
  const reason = details.reason;

  if (reason === "invalid_grant") return { cause: "Google 側で refresh token または認可コードが無効化されています。", reconnectRequired: true, action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。" };
  if (reason === "stored_refresh_token_missing") return { cause: "保存済み refresh token が欠落しています。", reconnectRequired: true, action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。" };
  if (reason === "insufficient_google_scope") return { cause: "保存済み Google OAuth トークンに Calendar / Tasks / Drive の権限がありません。", reconnectRequired: true, action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、Calendar / Tasks / Drive を許可して再連携してください。" };
  if (reason === "server_oauth_configuration") return { cause: "Cloud Functions の OAuth 設定に問題があります。", reconnectRequired: false, action: details.adminAction ?? "ユーザー操作では直りません。Firebase Functions secrets を確認してください。" };
  if (reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed") return { cause: "暗号化キー不一致、または保存済み refresh token の暗号化データ破損が疑われます。", reconnectRequired: false, action: "ユーザー操作では直りません。暗号化キーと保存データを確認してください。" };
  if (code === "not-found") return { cause: "Firestore に保存済み Google OAuth アカウントが見つかりません。", reconnectRequired: false, action: "画面から Google アカウントを再連携してください。" };
  if (isInvalidRefreshTokenError(error)) return { cause: "Google 側で refresh token が無効化されています。", reconnectRequired: true, action: "Google アカウントのサードパーティ連携からこのアプリを削除してから、アプリで再連携してください。" };
  if (isOAuthClientConfigurationError(error)) return { cause: "Cloud Functions の OAuth 設定に問題があります。", reconnectRequired: false, action: "ユーザー操作では直りません。Firebase Functions secrets を確認してください。" };
  if (isServerInfrastructureError(error)) return { cause: "Cloud Functions の一時障害または制限により refresh token 更新に失敗しました。", reconnectRequired: false, action: "サーバーリトライまたは後続リトライで復旧します。" };
  return { cause: "Google OAuth refresh token 更新に失敗しました。原因は未分類です。", reconnectRequired: false, action: "Firebase Functions ログ、Firestore の保存状態、Google Cloud Console の OAuth 設定を確認してください。" };
};
const isGoogleOAuthDeterministicErrorReason = (reason: string | undefined): boolean => reason === "invalid_grant" || reason === "stored_refresh_token_missing" || reason === "insufficient_google_scope" || reason === "server_oauth_configuration" || reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed";
const toUserTransparentAutoRecoveryError = (sourceError: unknown): Error => {
  const code = normalizeCallableErrorCode(sourceError);
  const reason = getGoogleOAuthCallableErrorReason(sourceError);
  if (reason === "server_oauth_configuration" || isOAuthClientConfigurationError(sourceError)) return createGoogleOAuthError(SERVER_OAUTH_CONFIGURATION_ERROR_MESSAGE, SERVER_OAUTH_CONFIGURATION_ERROR_CODE, reason ?? "server_oauth_configuration");
  if (reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed") return createGoogleOAuthError(SERVER_TOKEN_DECRYPT_ERROR_MESSAGE, SERVER_TOKEN_DECRYPT_ERROR_CODE, reason);
  if (reason === "insufficient_google_scope") return createGoogleOAuthError(INSUFFICIENT_GOOGLE_SCOPE_MESSAGE, INSUFFICIENT_GOOGLE_SCOPE_ERROR_CODE, reason);
  if (code === "not-found") return createGoogleOAuthError(INVALID_REFRESH_TOKEN_MESSAGE, INVALID_REFRESH_TOKEN_ERROR_CODE, "stored_refresh_token_missing");
  if (reason === "invalid_grant" || reason === "stored_refresh_token_missing" || isInvalidRefreshTokenError(sourceError)) return createGoogleOAuthError(INVALID_REFRESH_TOKEN_MESSAGE, INVALID_REFRESH_TOKEN_ERROR_CODE, reason ?? "invalid_grant");
  return createGoogleOAuthError(AUTO_RECOVERY_PENDING_MESSAGE, AUTO_RECOVERY_PENDING_ERROR_CODE, reason);
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

  throw new Error("Google server token refresh retry loop exhausted");
};
const isServerStoredGoogleOAuthEnabled = (): boolean => {
  if (isDesktopLikeRuntime()) return true;
  if (import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "false") return false;

  return (
    import.meta.env.PROD ||
    import.meta.env.VITE_GOOGLE_OAUTH_SERVER_TOKENS === "true"
  );
};
const exchangeGoogleCalendarCode = async (input: ExchangeGoogleCalendarCodeInput): Promise<ServerGoogleCalendarAccess> => {
  try {
    await waitForCallableAuth();

    const result = await exchangeGoogleCalendarCodeCallable({
      ...input,
      codeVerifier:
        input.codeVerifier ??
        consumeGoogleCalendarServerCodeVerifier() ??
        undefined,
    });
    return result.data;
  } catch (error) {
    throw toUserTransparentAutoRecoveryError(error);
  }
};
const getServerStoredGoogleCalendarAccessToken = async (input: GetGoogleCalendarAccessTokenInput): Promise<ServerGoogleCalendarAccess> => {
  try {
    await waitForCallableAuth();
    return await getGoogleCalendarAccessTokenWithRetry(input);
  } catch (error) {
    throw toUserTransparentAutoRecoveryError(error);
  }
};
const exchangeGoogleConnectedServiceCode = async (input: ExchangeGoogleCalendarCodeInput): Promise<ServerGoogleCalendarAccess> => exchangeGoogleCalendarCode(input);
const getServerStoredGoogleConnectedServiceAccessToken = async (input: GetGoogleCalendarAccessTokenInput): Promise<ServerGoogleCalendarAccess> => getServerStoredGoogleCalendarAccessToken(input);
const disconnectServerStoredGoogleCalendarAccount = async (input: DisconnectGoogleCalendarAccountInput): Promise<void> => {
  await waitForCallableAuth();
  await disconnectGoogleCalendarAccountCallable(input);
};



export { readGoogleOAuthCallableErrorDetails, getGoogleOAuthCallableErrorReason, diagnoseGoogleOAuthReconnectCause, isGoogleOAuthDeterministicErrorReason, toUserTransparentAutoRecoveryError, isServerStoredGoogleOAuthEnabled, exchangeGoogleCalendarCode, exchangeGoogleConnectedServiceCode, getServerStoredGoogleCalendarAccessToken, getServerStoredGoogleConnectedServiceAccessToken, disconnectServerStoredGoogleCalendarAccount };


export type { GoogleOAuthCallableErrorReason };
