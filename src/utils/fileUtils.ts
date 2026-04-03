import { nanoid } from "nanoid";

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "webm"],
  document: ["pdf", "pptx", "txt", "md"],
};

/**
 * ファイル拡張子の検証と取得
 */
const getValidatedExtension = (
  filename: string,
  expectedType?: string,
): string => {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return "bin";

  const ext = parts[parts.length - 1];

  // タイプ指定がある場合は検証
  if (expectedType) {
    const allowedExts = ALLOWED_EXTENSIONS[expectedType] || [];
    return allowedExts.includes(ext) ? ext : "bin";
  }

  // すべての許可された拡張子をチェック
  const allAllowed = Object.values(ALLOWED_EXTENSIONS).flat();
  return allAllowed.includes(ext) ? ext : "bin";
};

/**
 * 安全なストレージパスの生成
 */
export const generateSafeStoragePath = (
  originalName: string,
  fileType?: string,
): { safeName: string; extension: string; id: string } => {
  const extension = getValidatedExtension(originalName, fileType);
  const id = nanoid(10);
  const safeName = `${Date.now()}_${id}.${extension}`;

  return { safeName, extension, id };
};
/**
 * バイト数を読みやすい形式にフォーマット
 */
export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
