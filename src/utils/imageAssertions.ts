import type { UploadedImage } from "@/types";
import { isBase64DataUrl, isBlobUrl, isStorageUrl } from "@/types/core/branded";



type ImageUrlField = "remoteUrl" | "localUrl" | "thumbnailUrl";



/**
 * 画像ドメインの不変条件違反を示すエラー
 * このエラーが発生した場合、設計上の重大な問題がある
 */
class ImageInvariantViolation extends Error {
  constructor(message: string, public readonly imageId?: string) {
    super(`[ImageInvariant] ${message}`);
    this.name = "ImageInvariantViolation";
  }
}
const assertNoBase64Url = (
  value: string | null | undefined,
  field: ImageUrlField,
  imageId?: string,
): void => {
  if (!value) return;

  if (isBase64DataUrl(value) || value.includes("base64,")) {
    throw new ImageInvariantViolation(
      `Base64 detected in ${field} (MUST NOT be persisted)`,
      imageId,
    );
  }
};
const assertStorageUrlField = (
  value: string | null | undefined,
  field: "remoteUrl" | "thumbnailUrl",
  imageId?: string,
): void => {
  if (!value) return;

  if (!isStorageUrl(value)) {
    throw new ImageInvariantViolation(
      `Invalid ${field}: must be Firebase Storage HTTPS URL, got: ${value}`,
      imageId,
    );
  }
};
const assertBlobUrlField = (
  value: string | null | undefined,
  imageId?: string,
): void => {
  if (!value) return;

  if (!isBlobUrl(value)) {
    throw new ImageInvariantViolation(
      `Invalid localUrl: must be Blob URL (blob:), got: ${value}`,
      imageId,
    );
  }
};
/**
 * 不変条件1: DBに保存される URL に Base64 文字列は存在してはならない
 *
 * @throws {ImageInvariantViolation} Base64 が検出された場合
 */
const assertNoBase64InImage = (image: UploadedImage): void => {
  assertNoBase64Url(image.remoteUrl ?? null, "remoteUrl", image.id);
  assertNoBase64Url(image.localUrl ?? null, "localUrl", image.id);
  assertNoBase64Url(image.thumbnailUrl ?? null, "thumbnailUrl", image.id);
};
/**
 * 不変条件2: remoteUrl / thumbnailUrl は Storage 由来の https URL のみ
 *
 * @throws {ImageInvariantViolation} 不正な URL の場合
 */
const assertValidRemoteUrls = (image: UploadedImage): void => {
  assertStorageUrlField(image.remoteUrl ?? null, "remoteUrl", image.id);
  assertStorageUrlField(image.thumbnailUrl ?? null, "thumbnailUrl", image.id);
};
/**
 * 不変条件3: localUrl は Blob URL のみ（data: 禁止）
 *
 * @throws {ImageInvariantViolation} 不正な URL の場合
 */
const assertValidLocalUrl = (image: UploadedImage): void => {
  assertBlobUrlField(image.localUrl ?? null, image.id);
};
/**
 * すべての画像不変条件をチェック
 * DB保存前に必ず呼び出すこと
 *
 * @throws {ImageInvariantViolation} いずれかの不変条件に違反した場合
 */
const assertImageInvariant = (image: UploadedImage): void => {
  assertNoBase64InImage(image);
  assertValidRemoteUrls(image);
  assertValidLocalUrl(image);
};
/**
 * 画像配列の不変条件をチェック
 *
 * @throws {ImageInvariantViolation} いずれかの画像が不変条件に違反した場合
 */
const assertImageArrayInvariant = (images: UploadedImage[]): void => {
  images.forEach(assertImageInvariant);
};



export { ImageInvariantViolation, assertNoBase64InImage, assertImageInvariant, assertImageArrayInvariant };
