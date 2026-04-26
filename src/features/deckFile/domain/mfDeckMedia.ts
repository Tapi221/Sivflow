import {
  MF_DECK_MEDIA_DIRECTORY,
  MF_DECK_MEDIA_URI_PREFIX,
  type MfDeckMediaEntryV1,
  type MfDeckMediaKindV1,
} from "@/features/deckFile/domain/mfDeckTypes";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

export const MF_DECK_MAX_MEDIA_ENTRY_BYTES = 32 * 1024 * 1024;
export const MF_DECK_MAX_MEDIA_TOTAL_BYTES = 96 * 1024 * 1024;

export const isMfDeckMediaPath = (value: string): boolean => {
  return (
    value.startsWith(MF_DECK_MEDIA_DIRECTORY) &&
    !value.endsWith("/") &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("\\")
  );
};

export const toMfDeckMediaUri = (path: string): string => {
  return `${MF_DECK_MEDIA_URI_PREFIX}${path}`;
};

export const isMfDeckMediaUri = (value: unknown): value is string => {
  return typeof value === "string" && value.startsWith(MF_DECK_MEDIA_URI_PREFIX);
};

export const pathFromMfDeckMediaUri = (value: string): string | null => {
  if (!isMfDeckMediaUri(value)) return null;

  const path = value.slice(MF_DECK_MEDIA_URI_PREFIX.length);
  return isMfDeckMediaPath(path) ? path : null;
};

export const inferMfDeckMediaKind = (mimeType: string): MfDeckMediaKindV1 => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "unknown";
};

export const inferMfDeckMediaExtension = (input: {
  mimeType: string;
  sourceName?: string;
  url?: string;
}): string => {
  const normalizedMimeType = input.mimeType.toLowerCase().split(";")[0].trim();
  const byMime = EXTENSION_BY_MIME_TYPE[normalizedMimeType];
  if (byMime) return byMime;

  const source = input.sourceName || input.url || "";
  const match = source.match(/\.([a-z0-9]{1,8})(?:[?#].*)?$/i);
  if (match?.[1]) return match[1].toLowerCase();

  return "bin";
};

export const sanitizeMfDeckMediaName = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);

  return sanitized || "media";
};

export const buildMfDeckMediaPath = (input: {
  index: number;
  kind: MfDeckMediaKindV1;
  extension: string;
  sourceName?: string;
}): string => {
  const directory = input.kind === "audio" ? "audio" : input.kind === "image" ? "images" : "files";
  const name = sanitizeMfDeckMediaName(input.sourceName ?? `${input.kind}-${input.index}`);
  const cleanExtension = sanitizeMfDeckMediaName(input.extension).replace(/^\.+/, "") || "bin";
  const paddedIndex = String(input.index).padStart(4, "0");

  return `${MF_DECK_MEDIA_DIRECTORY}${directory}/${paddedIndex}-${name}.${cleanExtension}`;
};

export const buildMfDeckMediaManifest = (
  mediaEntries: MfDeckMediaEntryV1[],
) => ({
  format: "manifolia.deck.media" as const,
  version: 1 as const,
  media: mediaEntries,
});
