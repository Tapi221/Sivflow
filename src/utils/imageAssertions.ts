import type { UploadedImage } from "@/types";
import { isBase64DataUrl, isBlobUrl, isStorageUrl } from "@/types/core/branded";

/**
 * 画像ドメインの不変条件違反を示すエラー
 * このエラーが発生した場合、設計上の重大な問題がある
 */
export class ImageInvariantViolation extends Error {
  constructor(
    message: string,
    public readonly imageId?: string,
  ) {
    super(`[ImageInvariant] ${message}`);
    this.name = "ImageInvariantViolation";
  }
}

/**
 * 不変条件1: DBに保存されるデータに Base64 文字列は存在してはならない
 *
 * @throws {ImageInvariantViolation} Base64 が検出された場合
 */
export const assertNoBase64InImage = (image: UploadedImage): void => {
  if (image.remoteUrl && isBase64DataUrl(image.remoteUrl as string)) {
    throw new ImageInvariantViolation(
      `Base64 detected in remoteUrl (MUST be Storage URL only)`,
      image.id,
    );
  }

  if (image.localUrl && isBase64DataUrl(image.localUrl as string)) {
    throw new ImageInvariantViolation(
      `Base64 detected in localUrl (MUST be Blob URL only)`,
      image.id,
    );
  }
};

/**
 * 不変条件2: remoteUrl は Storage由来の https URL のみ
 *
 * @throws {ImageInvariantViolation} 不正な URL の場合
 */
export const assertValidRemoteUrl = (image: UploadedImage): void => {
  if (!image.remoteUrl) return; // null/undefined は許可

  if (!isStorageUrl(image.remoteUrl as string)) {
    throw new ImageInvariantViolation(
      `Invalid remoteUrl: must be Firebase Storage HTTPS URL, got: ${image.remoteUrl}`,
      image.id,
    );
  }
};

/**
 * 不変条件3: localUrl は Blob URL のみ（data: 禁止）
 *
 * @throws {ImageInvariantViolation} 不正な URL の場合
 */
export const assertValidLocalUrl = (image: UploadedImage): void => {
  if (!image.localUrl) return; // null/undefined は許可

  if (!isBlobUrl(image.localUrl as string)) {
    throw new ImageInvariantViolation(
      `Invalid localUrl: must be Blob URL (blob:), got: ${image.localUrl}`,
      image.id,
    );
  }
};

/**
 * すべての画像不変条件をチェック
 * DB保存前に必ず呼び出すこと
 *
 * @throws {ImageInvariantViolation} いずれかの不変条件に違反した場合
 */
export const assertImageInvariant = (image: UploadedImage): void => {
  assertNoBase64InImage(image);
  assertValidRemoteUrl(image);
  assertValidLocalUrl(image);
};

/**
 * 画像配列の不変条件をチェック
 *
 * @throws {ImageInvariantViolation} いずれかの画像が不変条件に違反した場合
 */
export const assertImageArrayInvariant = (images: UploadedImage[]): void => {
  images.forEach(assertImageInvariant);
};

/**
 * 開発環境でのみ警告を出す（本番では無視）
 * 軽微な違反や移行期の警告に使用
 */
export const warnImageInvariant = (message: string, imageId?: string): void => {
  if (import.meta.env.DEV) {
    console.warn(
      `[ImageInvariant Warning] ${message}`,
      imageId ? `(ID: ${imageId})` : "",
    );
  }
};

