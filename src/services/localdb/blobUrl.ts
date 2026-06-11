import { telemetryOncePerSession } from "@/services/localDBRuntimeState";
import { findBlobUrlFixesDeep } from "@/utils/blobUrlSanitizer";



type InvalidImageUrlErrorParams = {
  entityType?: string;
  entityId?: string;
  path?: string;
  message?: string;
};



const InvalidImageUrlError = class extends Error {
  entityType?: string;
  entityId?: string;
  path?: string;

  constructor(params: InvalidImageUrlErrorParams) {
    const parts: Array<string | null> = [
      params.message ??
      "画像の保存形式が不正です。blob: URL は保存できません。",
      params.entityType ? `entityType=${params.entityType}` : null,
      params.entityId ? `id=${params.entityId}` : null,
      params.path ? `path=${params.path}` : null,
    ];

    const details = parts
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" ");

    super(details);
    this.name = "InvalidImageUrlError";
    this.entityType = params.entityType;
    this.entityId = params.entityId;
    this.path = params.path;
  }
};



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const toIdString = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
};
const getIdFromUnknownEntity = (entity: unknown): string | undefined => {
  if (!isRecord(entity)) return undefined;
  if (!("id" in entity)) return undefined;
  return toIdString(entity.id);
};
const setNestedPath = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const keys = path.split(".").filter((k) => k.length > 0);
  if (keys.length === 0) return;

  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const current = cursor[key];

    if (!isRecord(current)) {
      cursor[key] = {};
    }

    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[keys[keys.length - 1]] = value;
};
const safeRevokeBlobUrl = (url: unknown, context: string): void => {
  if (typeof url !== "string" || !url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;

  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn(`[LocalDB] Failed to revoke blob URL (${context})`, error);
  }
};
const hasBlobUrlDeep = (value: unknown): boolean => {
  return findBlobUrlFixesDeep(value).length > 0;
};
const assertNoBlobUrlInCardPayload = (cardLike: unknown, context?: { entityType?: string; entityId?: string; },
): void => {
  if (!isRecord(cardLike)) return;

  const fixes = findBlobUrlFixesDeep(cardLike);
  if (fixes.length === 0) return;

  telemetryOncePerSession("cards:blob-url-persist-blocked");

  const firstFix = fixes[0];
  const fixPath =
    typeof firstFix.path === "string" && firstFix.path.length > 0
      ? firstFix.path
      : "<root>";

  throw new InvalidImageUrlError({
    message: "画像の保存形式が不正です。blob: URL は保存できません。",
    entityType: context?.entityType ?? "card",
    entityId: context?.entityId ?? getIdFromUnknownEntity(cardLike),
    path: fixPath,
  });
};
const scrubBlobUrlsDeep = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.startsWith("blob:") ? null : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubBlobUrlsDeep(entry));
  }

  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = scrubBlobUrlsDeep(nested);
    }
    return result;
  }

  return value;
};
const buildCardCandidateFromMods = (obj: unknown, mods: unknown): unknown => {
  if (!isRecord(obj)) return mods;
  if (!isRecord(mods)) return obj;

  const candidate: Record<string, unknown> = { ...obj };

  for (const [key, value] of Object.entries(mods)) {
    if (key.includes(".")) {
      setNestedPath(candidate, key, value);
    } else {
      candidate[key] = value;
    }
  }

  return candidate;
};



export { safeRevokeBlobUrl, hasBlobUrlDeep, assertNoBlobUrlInCardPayload, scrubBlobUrlsDeep, buildCardCandidateFromMods };
