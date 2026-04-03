import type { UploadedImage } from "@/types";

/**
 * DB 保存前の厳格なバリデーション（全保存パスで必須）
 */
export const strictValidateBeforeSave = (image: UploadedImage): void => {
  // remoteUrl チェック
  if (image.remoteUrl) {
    if (!image.remoteUrl.startsWith("https://")) {
      throw new Error(
        `[CRITICAL] Invalid remoteUrl detected: ${image.remoteUrl.substring(0, 50)}`,
      );
    }
    // Base64 チェック（data: プレフィックス + MIME 型）
    if (image.remoteUrl.startsWith("data:")) {
      throw new Error(
        `[CRITICAL] Base64 in remoteUrl: ${image.remoteUrl.substring(0, 50)}`,
      );
    }
    // MIME 型チェック（より厳格）
    if (image.remoteUrl.includes("base64,")) {
      throw new Error(`[CRITICAL] Base64 encoding detected in remoteUrl`);
    }
  }

  // localUrl チェック
  if (image.localUrl) {
    if (!image.localUrl.startsWith("blob:")) {
      throw new Error(
        `[CRITICAL] Invalid localUrl detected: ${image.localUrl.substring(0, 50)}`,
      );
    }
    // Base64 チェック（data: プレフィックス + MIME 型）
    if (image.localUrl.startsWith("data:")) {
      throw new Error(
        `[CRITICAL] Base64 in localUrl: ${image.localUrl.substring(0, 50)}`,
      );
    }
    // MIME 型チェック（より厳格）
    if (image.localUrl.includes("base64,")) {
      throw new Error(`[CRITICAL] Base64 encoding detected in localUrl`);
    }
  }

  // 開発環境でのみ警告
  if (import.meta.env.DEV) {
    console.log("[Validation] UploadedImage passed strict validation", image);
  }
};
