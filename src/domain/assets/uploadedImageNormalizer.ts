import { generateUploadedImageId } from "./uploadedImageFactory";
import type { UploadFallbackReason, UploadSource } from "@/types";
import type { BlobUrl, StorageUrl } from "@/types/core/branded";



type NormalizeUploadedImageOptions = {
  onInvalid?: "skip" | "throw";
};
type DenormalizeUploadedImageOptions = {
  case?: "camel" | "snake";
  stripUndefined?: boolean;
};



const resolveString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return undefined;
};
const resolveNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};
const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};
const pickFirst = (
  record: Record<string, unknown>,
  keys: string[],
): unknown => {
  for (const key of keys) {
    if (key in record) return record[key];
  }

  return undefined;
};
const normalizeUploadedImage = (
  raw: unknown,
  options: NormalizeUploadedImageOptions = {},
) => {
  if ((raw === null || raw === undefined)) return null;

  if (typeof raw === "string") {
    return {
      id: generateUploadedImageId(),
      remoteUrl: raw as StorageUrl,
      status: "ready" as const,
      localUrl: null,
      contentType: null,
      size: null,
      storagePath: null,
    };
  }

  if (typeof raw !== "object") {
    if (options.onInvalid === "throw") {
      throw new Error("Invalid UploadedImage input");
    }

    return null;
  }

  const record = raw as Record<string, unknown>;
  const remoteUrl = resolveString(
    pickFirst(record, ["remoteUrl", "remote_url", "url"]),
  );
  const localUrl = resolveString(pickFirst(record, ["localUrl", "local_url"]));
  const status = resolveString(pickFirst(record, ["status"])) as
    | "uploading"
    | "ready"
    | "failed"
    | undefined;
  const contentType = resolveString(
    pickFirst(record, ["contentType", "content_type", "mimeType", "mime_type"]),
  );
  const size = resolveNumber(
    pickFirst(record, ["size", "sizeBytes", "size_bytes"]),
  );
  const storagePath = resolveString(
    pickFirst(record, ["storagePath", "storage_path", "path"]),
  );
  const localFileId = resolveString(
    pickFirst(record, ["localFileId", "local_file_id"]),
  );
  const assetId =
    resolveString(pickFirst(record, ["assetId", "asset_id"])) ??
    resolveString(pickFirst(record, ["id"]));
  const scale = resolveNumber(pickFirst(record, ["scale"]));
  const x = resolveNumber(pickFirst(record, ["x"]));
  const layoutValue = pickFirst(record, ["layout"]);
  const layoutRecord =
    layoutValue && typeof layoutValue === "object"
      ? (layoutValue as Record<string, unknown>)
      : null;
  const baseWidthPx = layoutRecord
    ? resolveNumber(pickFirst(layoutRecord, ["baseWidthPx", "base_width_px"]))
    : undefined;
  const cropX = layoutRecord
    ? resolveNumber(pickFirst(layoutRecord, ["cropX", "crop_x"]))
    : undefined;
  const naturalW = resolveNumber(pickFirst(record, ["naturalW", "natural_w"]));
  const naturalH = resolveNumber(pickFirst(record, ["naturalH", "natural_h"]));
  const source = resolveString(pickFirst(record, ["source"])) as
    | UploadSource
    | undefined;
  const fallbackReason = resolveString(
    pickFirst(record, ["fallbackReason", "fallback_reason"]),
  ) as UploadFallbackReason | undefined;

  if (!remoteUrl && !localUrl && !localFileId && !assetId) {
    if (options.onInvalid === "throw") {
      throw new Error("UploadedImage missing url");
    }

    return null;
  }

  const normalizedScale = clampNumber(scale ?? 1, 0.2, 1);
  const normalizedX = normalizedScale >= 0.999 ? 0 : clampNumber(x ?? 0, -1, 1);

  return {
    id: resolveString(pickFirst(record, ["id"])) ?? generateUploadedImageId(),
    assetId: assetId ?? null,
    localUrl: (localUrl ?? null) as BlobUrl | null,
    remoteUrl: (remoteUrl ?? null) as StorageUrl | null,
    localFileId: localFileId ?? null,
    status: status ?? (remoteUrl ? "ready" : "uploading"),
    contentType: contentType ?? null,
    size: size ?? null,
    storagePath: storagePath ?? null,
    source: source ?? (remoteUrl && !localUrl ? "cloud" : null),
    fallbackReason: fallbackReason ?? null,
    scale: normalizedScale,
    x: normalizedX,
    layout:
      (baseWidthPx !== null && baseWidthPx !== undefined) || (cropX !== null && cropX !== undefined)
        ? {
          baseWidthPx: baseWidthPx ?? null,
          cropX: cropX ?? null,
        }
        : null,
    naturalW: naturalW ?? null,
    naturalH: naturalH ?? null,
  };
};
const normalizeUploadedImages = (raw: unknown, options: NormalizeUploadedImageOptions = {}) => {
  if ((raw === null || raw === undefined)) return [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .map((item) => normalizeUploadedImage(item, options))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};
const denormalizeUploadedImage = (
  image: {
    id: string;
    assetId?: string | null;
    localFileId?: string | null;
    localUrl?: string | null;
    remoteUrl?: string | null;
    status: "uploading" | "ready" | "failed";
    contentType?: string | null;
    size?: number | null;
    storagePath?: string | null;
    layout?: {
      baseWidthPx?: number | null;
      cropX?: number | null;
    } | null;
  },
  options: DenormalizeUploadedImageOptions = {},
) => {
  const output: Record<string, unknown> =
    options.case === "snake"
      ? {
        id: image.id,
        asset_id: image.assetId ?? image.id,
        local_file_id: image.localFileId ?? image.assetId ?? image.id,
        url: image.remoteUrl ?? null,
        content_type: image.contentType ?? null,
        size: image.size ?? null,
        storage_path: image.storagePath ?? null,
        status: image.status,
        layout:
          (image.layout !== null && image.layout !== undefined)
            ? {
              base_width_px: image.layout.baseWidthPx ?? null,
              crop_x: image.layout.cropX ?? null,
            }
            : null,
      }
      : {
        id: image.id,
        assetId: image.assetId ?? image.id,
        localFileId: image.localFileId ?? image.assetId ?? image.id,
        url: image.remoteUrl ?? null,
        contentType: image.contentType ?? null,
        size: image.size ?? null,
        storagePath: image.storagePath ?? null,
        status: image.status,
        layout:
          (image.layout !== null && image.layout !== undefined)
            ? {
              baseWidthPx: image.layout.baseWidthPx ?? null,
              cropX: image.layout.cropX ?? null,
            }
            : null,
      };

  if (options.stripUndefined) {
    for (const key of Object.keys(output)) {
      if (output[key] === undefined) {
        delete output[key];
      }
    }
  }

  return output;
};
const denormalizeUploadedImages = (images: Array<{ id: string;
  assetId?: string | null;
  localFileId?: string | null;
  localUrl?: string | null;
  remoteUrl?: string | null;
  status: "uploading" | "ready" | "failed";
  contentType?: string | null;
  size?: number | null;
  storagePath?: string | null;
  layout?: {
    baseWidthPx?: number | null;
    cropX?: number | null;
  } | null;
}>,
options: DenormalizeUploadedImageOptions = {},
) => {
  return images.map((image) => denormalizeUploadedImage(image, options));
};



export { normalizeUploadedImages, denormalizeUploadedImages };


export type { NormalizeUploadedImageOptions, DenormalizeUploadedImageOptions };
