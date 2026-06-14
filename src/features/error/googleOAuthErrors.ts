import type { GoogleOAuthCallableErrorReason } from "@/integration/google-integration/google.server-oauth";
import { getGoogleOAuthCallableErrorReason, isGoogleOAuthDeterministicErrorReason } from "@/integration/google-integration/google.server-oauth";



type GoogleOAuthCooldownReason = GoogleOAuthCallableErrorReason | "auto_recovery_pending" | "internal";
type GoogleOAuthCooldownEntry = {
  reason: GoogleOAuthCooldownReason;
  message: string;
  until: number;
};



const GOOGLE_OAUTH_DETERMINISTIC_ERROR_COOLDOWN_MS = 60_000;



const getErrorStatus = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { status?: number; }).status;
};
const isUnauthorizedError = (error: unknown): boolean => getErrorStatus(error) === 401;
const getGoogleReason = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { googleReason?: string; }).googleReason;
};
const isGooglePermissionError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  const reason = getGoogleReason(error);

  return (
    status === 403 &&
    (reason === "authError" || reason === "insufficientPermissions")
  );
};
const getErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  return (error as Error & { code?: string; }).code;
};
const normalizeErrorCode = (code: string | undefined): string | undefined => code?.replace(/^functions\//, "");
const getGoogleOAuthErrorReason = (error: unknown): GoogleOAuthCallableErrorReason | undefined => {
  const wrappedReason = error instanceof Error ? (error as Error & { googleOAuthReason?: GoogleOAuthCallableErrorReason; }).googleOAuthReason : undefined;

  return wrappedReason ?? getGoogleOAuthCallableErrorReason(error);
};
const isGoogleOAuthReconnectRequiredReason = (reason: string | undefined): boolean =>
  reason === "invalid_grant" || reason === "stored_refresh_token_missing";
const isReconnectRequiredError = (error: unknown): boolean => {
  const code = normalizeErrorCode(getErrorCode(error));
  const reason = getGoogleOAuthErrorReason(error);

  if (reason) return isGoogleOAuthReconnectRequiredReason(reason);

  return (
    isUnauthorizedError(error) ||
    isGooglePermissionError(error) ||
    code === "not-found" ||
    code === "failed-precondition" ||
    code === "permission-denied" ||
    code === "unauthenticated"
  );
};
const toErrorMessage = (error: unknown): string => error instanceof Error ? error.message.includes("Google did not return a new refresh token") ? "Google が新しい連携トークンを返しませんでした。Google アカウントの「サードパーティ製アプリとサービス」からこのアプリのアクセス権を削除してから、もう一度再連携してください。" : error.message : String(error);
const toGoogleCalendarAuthErrorMessage = (error: unknown): string => {
  const reason = getGoogleOAuthErrorReason(error);

  if (reason === "invalid_grant" || reason === "stored_refresh_token_missing") {
    return "Google 連携トークンが無効です。Google アカウントのサードパーティ連携からこのアプリを削除してから再連携してください。";
  }

  if (reason === "server_oauth_configuration") {
    return "Google OAuth のサーバー設定に問題があります。管理者が Firebase Functions secrets を確認してください。";
  }

  if (reason === "token_encryption_key_invalid" || reason === "stored_refresh_token_decrypt_failed") {
    return "保存済み Google 連携トークンを復号できません。管理者が暗号化キーと保存データを確認してください。";
  }

  return `Google Calendar token refresh failed: ${toErrorMessage(error)}`;
};
const shouldCooldownGoogleOAuthError = (error: unknown): boolean => isGoogleOAuthDeterministicErrorReason(getGoogleOAuthErrorReason(error)) || normalizeErrorCode(getErrorCode(error)) === "auto-recovery-pending" || normalizeErrorCode(getErrorCode(error)) === "internal";
const createGoogleOAuthCooldownError = (entry: GoogleOAuthCooldownEntry): Error => {
  const error = new Error(entry.message);
  (error as Error & { code?: string; googleOAuthReason?: GoogleOAuthCallableErrorReason; }).code = "google-oauth-deterministic-cooldown";
  if (entry.reason !== "auto_recovery_pending" && entry.reason !== "internal") {
    (error as Error & { code?: string; googleOAuthReason?: GoogleOAuthCallableErrorReason; }).googleOAuthReason = entry.reason;
  }
  return error;
};



export { GOOGLE_OAUTH_DETERMINISTIC_ERROR_COOLDOWN_MS, getErrorStatus, isUnauthorizedError, getGoogleReason, isGooglePermissionError, getErrorCode, normalizeErrorCode, getGoogleOAuthErrorReason, isReconnectRequiredError, toErrorMessage, toGoogleCalendarAuthErrorMessage, shouldCooldownGoogleOAuthError, createGoogleOAuthCooldownError };


export type { GoogleOAuthCooldownReason, GoogleOAuthCooldownEntry };
