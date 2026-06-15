import type { LocalDBFallbackReasonCode } from "@/services/localDBRuntimeState";



type UnknownRecord = Record<string, unknown>;
type ErrorNameMessage = {
  name?: string;
  message?: string;
  inner?: unknown;
  cause?: unknown;
};



const LOCALDB_ERROR_MESSAGE_LIMIT = 400;
const MAX_ERROR_NESTING_DEPTH = 4;



const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;
const getStringProp = (obj: UnknownRecord, key: string): string | undefined => {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
};
const safeJsonStringify = (value: unknown): string | undefined => {
  try {
    const stringified = JSON.stringify(value);
    return typeof stringified === "string" ? stringified : undefined;
  } catch {
    return undefined;
  }
};
const getErrorNameMessage = (error: unknown): ErrorNameMessage => {
  if (!error) return {};

  if (error instanceof Error) {
    return {
      name: typeof error.name === "string" ? error.name : undefined,
      message: typeof error.message === "string" ? error.message : undefined,
      cause: (error as { cause?: unknown; }).cause,
    };
  }

  if (isObject(error)) {
    return {
      name: getStringProp(error, "name"),
      message: getStringProp(error, "message"),
      inner: error.inner,
      cause: error.cause,
    };
  }

  if (typeof error === "string") return { message: error };

  return { message: String(error) };
};
const extractErrorTexts = (
  error: unknown,
  collector: string[],
  depth = 0,
): void => {
  if (!error || depth > MAX_ERROR_NESTING_DEPTH) return;

  const { name, message, inner, cause } = getErrorNameMessage(error);
  const normalizedName = typeof name === "string" ? name : "";
  const normalizedMessage = typeof message === "string" ? message : "";
  const text = `${normalizedName} ${normalizedMessage}`.toLowerCase();

  if (text.trim()) collector.push(text);

  extractErrorTexts(inner, collector, depth + 1);
  extractErrorTexts(cause, collector, depth + 1);
};
const safeStringifyError = (error: unknown): string => {
  try {
    if (!error) return "unknown error";

    const { name, message } = getErrorNameMessage(error);
    const maybeName = name ? `${name}: ` : "";
    const fallback =
      safeJsonStringify(error) ??
      (typeof error === "string" ? error : String(error));
    const maybeMessage = message ?? fallback;

    return `${maybeName}${String(maybeMessage)}`.slice(
      0,
      LOCALDB_ERROR_MESSAGE_LIMIT,
    );
  } catch {
    return "unknown error";
  }
};
const isBackingStoreOpenError = (error: unknown): boolean => {
  const texts: string[] = [];
  extractErrorTexts(error, texts);

  if (texts.length === 0) return false;

  const merged = texts.join(" | ");
  const hasUnknownError =
    merged.includes("unknownerror") || merged.includes("unknown error");
  const hasBackingStoreToken =
    merged.includes("opening backing store") ||
    merged.includes("backing store") ||
    merged.includes("indexeddb.open");

  return hasUnknownError && hasBackingStoreToken;
};
const classifyFallbackReasonCode = (error: unknown): LocalDBFallbackReasonCode => {
  if (isBackingStoreOpenError(error)) return "backing_store_open_error";

  const texts: string[] = [];
  extractErrorTexts(error, texts);
  const merged = texts.join(" | ");

  if (merged.includes("quotaexceeded") || merged.includes("quota exceeded")) {
    return "quota_exceeded";
  }

  if (
    merged.includes("securityerror") ||
    merged.includes("access denied") ||
    merged.includes("not allowed") ||
    merged.includes("disabled")
  ) {
    return "indexeddb_blocked";
  }

  if (
    merged.includes("blocked") ||
    merged.includes("versionchange") ||
    merged.includes("upgradeneeded")
  ) {
    return "upgrade_needed_or_blocked";
  }

  return "unknown";
};



export { safeStringifyError, isBackingStoreOpenError, classifyFallbackReasonCode };
