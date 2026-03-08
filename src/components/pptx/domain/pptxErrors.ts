/**
 * Pure functions for error classification and analysis.
 * No React, no Firebase, no I/O.
 */

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  const rawCode = normalizeString(record.code);
  if (!rawCode) return null;
  return rawCode
    .toLowerCase()
    .replace(/^firestore\//, "")
    .replace(/^firebase\//, "");
};

const getErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") return "";
  const record = error as Record<string, unknown>;
  return normalizeString(record.message)?.toLowerCase() ?? "";
};

const getErrorText = (error: unknown): string => {
  const code = getErrorCode(error) ?? "";
  const message = getErrorMessage(error);
  return `${code} ${message}`.trim();
};

export const isStorageObjectNotFound = (error: unknown): boolean => {
  const text = getErrorText(error);
  return (
    text.includes("storage/object-not-found") ||
    text.includes("manifest_not_found")
  );
};

export const isFirestoreBlockedByClient = (error: unknown): boolean => {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === "blocked-by-client" || code === "err_blocked_by_client")
    return true;
  return (
    text.includes("err_blocked_by_client") ||
    (text.includes("blocked") && text.includes("client"))
  );
};

export const isFirestoreUnavailable = (error: unknown): boolean => {
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === "unavailable" || code === "deadline-exceeded") return true;
  return (
    text.includes("unavailable") ||
    text.includes("network request failed") ||
    text.includes("failed to fetch") ||
    text.includes("networkerror")
  );
};

export const isLikelyClientBlock = (
  error: unknown,
  isOnline: boolean,
): boolean => {
  if (!isOnline) return false;
  if (isFirestoreBlockedByClient(error)) return true;
  const text = getErrorText(error);
  return (
    text.includes("failed to fetch") &&
    (text.includes("googleapis.com") ||
      text.includes("firestore") ||
      text.includes("blocked"))
  );
};

export const classifyConversionRequestError = (
  error: unknown,
  isOnline: boolean,
): string => {
  if (isFirestoreBlockedByClient(error))
    return "conversion_request_blocked_by_client";
  if (isLikelyClientBlock(error, isOnline))
    return "conversion_request_probably_blocked_by_client";
  const code = getErrorCode(error);
  const text = getErrorText(error);
  if (code === "permission-denied" || text.includes("permission-denied"))
    return "conversion_request_permission_denied";
  if (code === "unavailable") return "conversion_request_unavailable";
  if (code === "failed-precondition")
    return "conversion_request_failed_precondition";
  if (code === "cancelled") return "conversion_request_cancelled";
  if (text.includes("offline")) return "conversion_request_offline";
  if (isFirestoreUnavailable(error)) return "conversion_request_unavailable";
  return "conversion_request_failed";
};



