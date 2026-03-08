import type { Base64DataUrl, BlobUrl } from "@/types/core/branded";
import { createBase64DataUrl, createBlobUrl } from "@/types/core/branded";

/**
 * 画像を圧縮してBase64 data URLに変換（内部使用のみ）
 *
 * ⚠️ 警告: この関数は内部処理でのみ使用すること
 * - DB や UploadedImage に Base64 を保存してはならない
 * - 外部からは compressImageToBlob を使用すること
 *
 * @internal
 */
const compressAndConvertToBase64Internal = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
): Promise<Base64DataUrl> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);

        resolve(createBase64DataUrl(dataUrl));
      };

      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () =>
      reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
};

/**
 * 画像を圧縮して Blob に変換（推奨）
 * Base64 を経由するが、最終的に Blob を返すため安全
 */
export const compressImageToBlob = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
): Promise<Blob> => {
  const base64 = await compressAndConvertToBase64Internal(
    file,
    maxWidth,
    maxHeight,
    quality,
  );
  const response = await fetch(base64);
  return response.blob();
};

/**
 * 画像を圧縮して Blob URL に変換（UI プレビュー用）
 *
 * ⚠️ 注意: 返された Blob URL は使用後に必ず revokeBlobUrl で解放すること
 */
export const compressImageToBlobUrl = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8,
): Promise<BlobUrl> => {
  const blob = await compressImageToBlob(file, maxWidth, maxHeight, quality);
  const url = URL.createObjectURL(blob);
  return createBlobUrl(url);
};

/**
 * @deprecated 後方互換性のため残すが、compressImageToBlob を使用すること
 *
 * @internal
 */
export const compressAndConvertToBase64 = compressAndConvertToBase64Internal;

/**
 * @deprecated uploadImageAsBase64 は非推奨。compressImageToBlob を使用すること
 */
export const uploadImageAsBase64 = async (file: File): Promise<string> => {
  return compressAndConvertToBase64Internal(file);
};





