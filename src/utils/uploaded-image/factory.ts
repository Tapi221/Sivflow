import type { UploadedImage } from "@/types";
import { createBlobUrl } from "@/types/core/branded";



const generateUploadedImageId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
const createUploadedImage = (file: File): UploadedImage => {
  const id = generateUploadedImageId();

  return {
    id,
    assetId: id,
    localFileId: id,
    localUrl: createBlobUrl(URL.createObjectURL(file)),
    remoteUrl: null,
    status: "uploading",
    contentType: file.type || null,
    size: Number.isFinite(file.size) ? file.size : null,
    storagePath: null,
    scale: 1,
    x: 0,
    layout: { baseWidthPx: null, cropX: 0 },
    naturalW: null,
    naturalH: null,
  };
};
const createFailedUploadedImage = (file: File): UploadedImage => {
  const id = generateUploadedImageId();

  return {
    id,
    assetId: id,
    localFileId: id,
    localUrl: null,
    remoteUrl: null,
    status: "failed",
    contentType: file.type || null,
    size: Number.isFinite(file.size) ? file.size : null,
    storagePath: null,
    scale: 1,
    x: 0,
    layout: { baseWidthPx: null, cropX: 0 },
    naturalW: null,
    naturalH: null,
  };
};



export { generateUploadedImageId, createUploadedImage, createFailedUploadedImage };
