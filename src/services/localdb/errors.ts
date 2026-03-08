import type { LocalDBFallbackReasonCode } from "@/services/localDBRuntimeState";
import { LOCALDB_ERROR_MESSAGE_LIMIT } from "./constants";

const MAX_ERROR_NESTING_DEPTH = 4;

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const getStringProp = (obj: UnknownRecord, key: string): string | undefined => {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
};

const safeJsonStringify = (value: unknown): string | undefined => {
  try {
    const s = JSON.stringify(value);
    return typeof s === "string" ? s : undefined;
  } catch {
    return undefined;
  }
};

const getErrorNameMessage = (
  error: unknown,
): { name?: string; message?: string; inner?: unknown; cause?: unknown } => {
  if (!error) return {};

  // まずは正統派
  if (error instanceof Error) {
    return {
      name: typeof error.name === "string" ? error.name : undefined,
      message: typeof error.message === "string" ? error.message : undefined,
      // Error.cause は unknown になり得る
      cause: (error as { cause?: unknown }).cause,
    };
  }

  // それっぽいオブジェクト（Dexie などもここに落ちる）
  if (isObject(error)) {
    return {
      name: getStringProp(error, "name"),
      message: getStringProp(error, "message"),
      inner: (error as UnknownRecord).inner,
      cause: (error as UnknownRecord).cause,
    };
  }

  // string / number / boolean / symbol など
  if (typeof error === "string") return { message: error };

  return { message: String(error) };
};

export const safeStringifyError = (error: unknown): string => {
  try {
    if (!error) return "unknown error";

    const { name, message } = getErrorNameMessage(error);

    const maybeName = name ? `${name}: ` : "";

    // message が取れない場合は JSON.stringify → String の順で諦める
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

export const extractErrorTexts = (
  error: unknown,
  collector: string[],
  depth = 0,
): void => {
  if (!error || depth > MAX_ERROR_NESTING_DEPTH) return;

  const { name, message, inner, cause } = getErrorNameMessage(error);

  const n = typeof name === "string" ? name : "";
  const m = typeof message === "string" ? message : "";

  const text = `${n} ${m}`.toLowerCase();
  if (text.trim()) collector.push(text);

  extractErrorTexts(inner, collector, depth + 1);
  extractErrorTexts(cause, collector, depth + 1);
};

export function isBackingStoreOpenError(error: unknown): boolean {
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
}

export const classifyFallbackReasonCode = (
  error: unknown,
): LocalDBFallbackReasonCode => {
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



