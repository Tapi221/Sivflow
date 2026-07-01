const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
/**
 * アップロードされた画像リストから Blob URL を削除してサニタイズする
 * (永続化前に呼び出すことで、有効期限切れの Blob URL 保存を防止する)
 */
const sanitizeUploadedImages = (images: unknown[]) => {
  if (!Array.isArray(images)) return [];

  return images.map((img) => {
    if (!isRecord(img)) return img;

    const localUrl = img["localUrl"];
    if (typeof localUrl === "string" && localUrl.startsWith("blob:")) {
      return { ...img, localUrl: null };
    }

    return img;
  });
};



export { sanitizeUploadedImages };
