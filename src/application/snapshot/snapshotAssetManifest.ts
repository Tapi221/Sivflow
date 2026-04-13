import type { AssetRecord } from "@/types";
import type { SnapshotAsset } from "@/types/domain/snapshot";

const toValidDate = (value: unknown): Date => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  const parsed = new Date(String(value ?? ""));
  if (Number.isFinite(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
};

const toNullableFiniteNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const toSnapshotAsset = (row: {
  id: string;
  remoteKey?: string | null;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}): SnapshotAsset | null => {
  const assetId = typeof row.id === "string" ? row.id.trim() : "";
  const storagePath =
    typeof row.remoteKey === "string" ? row.remoteKey.trim() : "";

  if (!assetId || !storagePath) {
    return null;
  }

  return {
    assetId,
    storagePath,
    mime:
      typeof row.mime === "string" && row.mime.trim().length > 0
        ? row.mime.trim()
        : "application/octet-stream",
    naturalW: toNullableFiniteNumber(row.width),
    naturalH: toNullableFiniteNumber(row.height),
    createdAt: toValidDate(row.createdAt).toISOString(),
    updatedAt: toValidDate(row.updatedAt).toISOString(),
  };
};

export const toAssetRecordFromSnapshotAsset = (
  asset: SnapshotAsset,
  userId: string,
): AssetRecord => {
  return {
    id: asset.assetId,
    userId,
    mime: asset.mime,
    size: 0,
    createdAt: toValidDate(asset.createdAt),
    updatedAt: toValidDate(asset.updatedAt),
    localBlobId: null,
    localStatus: "missing",
    remoteKey: asset.storagePath,
    remoteStatus: "ready",
    remoteUrlCache: null,
    width: toNullableFiniteNumber(asset.naturalW),
    height: toNullableFiniteNumber(asset.naturalH),
    retryCount: 0,
  };
};
