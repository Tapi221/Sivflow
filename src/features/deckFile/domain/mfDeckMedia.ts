import type { MfDeckMediaEntryV1, MfDeckMediaKindV1 } from "./mfDeck.types";
import { MF_DECK_MEDIA_DIRECTORY, MF_DECK_MEDIA_URI_PREFIX } from "./mfDeck.types";



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
const INVALID_FILENAME_CHARACTERS = new Set(["\\", "/", ":", "*", "?", "\"", "<", ">", "|"]);
const MF_DECK_MAX_MEDIA_ENTRY_BYTES = 32 * 1024 * 1024;
const MF_DECK_MAX_MEDIA_TOTAL_BYTES = 96 * 1024 * 1024;



const replaceControlCharacters = (value: string): string => {
  return Array.from(value, (char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && codePoint <= 0x1f ? "_" : char;
  }).join("");
};
const replaceInvalidFileNameCharacters = (value: string): string => {
  return Array.from(value, (char) =>
    INVALID_FILENAME_CHARACTERS.has(char) ? "_" : char,
  ).join("");
};
const replaceWhitespaceWithUnderscore = (value: string): string => {
  return Array.from(value, (char) => (char.trim() === "" ? "_" : char)).join("");
};
const collapseRepeatedUnderscores = (value: string): string => {
  let collapsed = "";

  for (const char of value) {
    if (char === "_" && collapsed.endsWith("_")) continue;
    collapsed += char;
  }

  return collapsed;
};
const stripUrlSuffix = (value: string): string => {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const suffixIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const endIndex = suffixIndexes.length > 0 ? Math.min(...suffixIndexes) : value.length;
  return value.slice(0, endIndex);
};
const isSafeExtension = (value: string): boolean => {
  if (value.length < 1 || value.length > 8) return false;
  return Array.from(value).every(
    (char) =>
      (char >= "a" && char <= "z") ||
      (char >= "0" && char <= "9"),
  );
};
const stripLeadingDots = (value: string): string => {
  let nextValue = value;

  while (nextValue.startsWith(".")) {
    nextValue = nextValue.slice(1);
  }

  return nextValue;
};
const isMfDeckMediaPath = (value: string): boolean => {
  return (value.startsWith(MF_DECK_MEDIA_DIRECTORY) && !value.endsWith("/") && !value.startsWith("/") && !value.includes("..") && !value.includes("\\"));
};
const toMfDeckMediaUri = (path: string): string => {
  return `${MF_DECK_MEDIA_URI_PREFIX}${path}`;
};
const isMfDeckMediaUri = (value: unknown): value is string => {
  return (typeof value === "string" && value.startsWith(MF_DECK_MEDIA_URI_PREFIX));
};
const pathFromMfDeckMediaUri = (value: string): string | null => {
  if (!isMfDeckMediaUri(value)) return null;

  const path = value.slice(MF_DECK_MEDIA_URI_PREFIX.length);
  return isMfDeckMediaPath(path) ? path : null;
};
const inferMfDeckMediaKind = (mimeType: string): MfDeckMediaKindV1 => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "unknown";
};
const inferMfDeckMediaExtension = (input: { mimeType: string;
  sourceName?: string;
  url?: string;
}): string => {
  const normalizedMimeType = input.mimeType.toLowerCase().split(";")[0].trim();
  const byMime = EXTENSION_BY_MIME_TYPE[normalizedMimeType];
  if (byMime) return byMime;

  const source = stripUrlSuffix((input.sourceName || input.url) ?? "");
  const dotIndex = source.lastIndexOf(".");
  const extension = dotIndex >= 0 ? source.slice(dotIndex + 1).toLowerCase() : "";
  if (isSafeExtension(extension)) return extension;

  return "bin";
};
const sanitizeMfDeckMediaName = (value: string): string => {
  const sanitized = collapseRepeatedUnderscores(replaceWhitespaceWithUnderscore(replaceInvalidFileNameCharacters(replaceControlCharacters(value.trim())))).slice(0, 80);

  return sanitized ?? "media";
};
const buildMfDeckMediaPath = (input: { index: number;
  kind: MfDeckMediaKindV1;
  extension: string;
  sourceName?: string;
}): string => {
  const directory =
    input.kind === "audio"
      ? "audio"
      : input.kind === "image"
        ? "images"
        : "files";
  const name = sanitizeMfDeckMediaName(
    input.sourceName ?? `${input.kind}-${input.index}`,
  );
  const cleanExtension = stripLeadingDots(sanitizeMfDeckMediaName(input.extension)) ?? "bin";
  const paddedIndex = String(input.index).padStart(4, "0");

  return `${MF_DECK_MEDIA_DIRECTORY}${directory}/${paddedIndex}-${name}.${cleanExtension}`;
};
const buildMfDeckMediaManifest = (mediaEntries: MfDeckMediaEntryV1[]) => ({ format: "sivflow.deck.media" as const, version: 1 as const, media: mediaEntries });



export { MF_DECK_MAX_MEDIA_ENTRY_BYTES, MF_DECK_MAX_MEDIA_TOTAL_BYTES, isMfDeckMediaPath, toMfDeckMediaUri, isMfDeckMediaUri, pathFromMfDeckMediaUri, inferMfDeckMediaKind, inferMfDeckMediaExtension, sanitizeMfDeckMediaName, buildMfDeckMediaPath, buildMfDeckMediaManifest };
