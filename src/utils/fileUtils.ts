import { nanoid } from "nanoid";



const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "webm"],
  document: ["pdf", "txt", "md"],
};



const getValidatedExtension = (
  filename: string,
  expectedType?: string,
): string => {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return "bin";

  const ext = parts[parts.length - 1];

  if (expectedType) {
    const allowedExts = ALLOWED_EXTENSIONS[expectedType] ?? [];
    return allowedExts.includes(ext) ? ext : "bin";
  }

  const allAllowed = Object.values(ALLOWED_EXTENSIONS).flat();
  return allAllowed.includes(ext) ? ext : "bin";
};
const generateSafeStoragePath = (originalName: string, fileType?: string): { safeName: string; extension: string; id: string; } => {
  const extension = getValidatedExtension(originalName, fileType);
  const id = nanoid(10);
  const safeName = `${Date.now()}_${id}.${extension}`;

  return { safeName, extension, id };
};
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};



export { generateSafeStoragePath, formatBytes };
