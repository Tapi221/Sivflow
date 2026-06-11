import type { AssetRecord, UploadedImage } from "@/types";



type AssetLikeRecord = Partial<AssetRecord> & Partial<UploadedImage>;



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const getString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};
const getNumber = (
  record: Record<string, unknown>,
  key: string,
): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};
const getDate = (record: Record<string, unknown>, key: string): Date | null => {
  const value = record[key];
  return value instanceof Date ? value : null;
};
const toAssetLikeRecord = (value: unknown): AssetLikeRecord | null => {
  if (!isRecord(value)) return null;

  return {
    id: getString(value, "id") ?? undefined,
    userId: getString(value, "userId") ?? undefined,
    mime: getString(value, "mime") ?? undefined,
    size: getNumber(value, "size") ?? undefined,
    localBlobId: getString(value, "localBlobId") ?? undefined,
    localStatus:
      getString(value, "localStatus") === "missing" ? "missing" : "present",
    remoteKey: getString(value, "remoteKey") ?? undefined,
    remoteStatus: (() => {
      const status = getString(value, "remoteStatus");
      return status === "none" ||
        status === "uploading" ||
        status === "ready" ||
        status === "failed"
        ? status
        : undefined;
    })(),
    remoteUrlCache: getString(value, "remoteUrlCache") ?? undefined,
    createdAt: getDate(value, "createdAt") ?? undefined,
    retryCount: getNumber(value, "retryCount") ?? undefined,
  };
};
const makeAssetRecord = ({ existing, itemId, userId, mime, size, localBlobId, remoteKey, remoteStatus, remoteUrlCache, retryCount }: { existing: AssetLikeRecord | null;
  itemId: string;
  userId: string;
  mime: string;
  size: number;
  localBlobId: string;
  remoteKey: string | null;
  remoteStatus: "uploading" | "ready" | "failed";
  remoteUrlCache?: string | null;
  retryCount: number;
}): AssetRecord => {
  const now = new Date();

  return {
    id: itemId,
    userId: existing?.userId?.trim() || userId,
    mime: (existing?.mime?.trim() || mime) ?? "application/octet-stream",
    size: existing?.size ?? size,
    localBlobId: existing?.localBlobId?.trim() || localBlobId,
    localStatus: existing?.localStatus === "missing" ? "missing" : "present",
    remoteKey: remoteKey ?? existing?.remoteKey ?? null,
    remoteStatus,
    remoteUrlCache: remoteUrlCache ?? existing?.remoteUrlCache ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    retryCount,
  };
};



export { toAssetLikeRecord, makeAssetRecord };


export type { AssetLikeRecord };
