import { MF_DECK_FILE_EXTENSION, MF_DECK_MIME_TYPE } from "@/features/deckFile/domain/mfDeck.types";



const INVALID_FILE_NAME_CHARACTERS = new Set(["\\", "/", ":", "*", "?", "\"", "<", ">", "|"]);



const replaceControlCharacters = (value: string): string => {
  return Array.from(value, (char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && codePoint <= 0x1f ? "_" : char;
  }).join("");
};
const replaceInvalidFileNameCharacters = (value: string): string => {
  return Array.from(value, (char) =>
    INVALID_FILE_NAME_CHARACTERS.has(char) ? "_" : char,
  ).join("");
};
const sanitizeFileNamePart = (value: string): string => {
  const trimmed = value.trim();
  const sanitized = replaceInvalidFileNameCharacters(
    replaceControlCharacters(trimmed),
  );
  return sanitized ?? "sivflow-deck";
};
const buildMfDeckFileName = (deckName: string): string => {
  const sanitizedName = sanitizeFileNamePart(deckName);
  const baseName = sanitizedName.toLowerCase().endsWith(MF_DECK_FILE_EXTENSION)
    ? sanitizedName.slice(0, -MF_DECK_FILE_EXTENSION.length)
    : sanitizedName;

  return `${baseName}${MF_DECK_FILE_EXTENSION}`;
};
const downloadBytesAsMfDeck = ({ bytes, deckName }: { bytes: Uint8Array;
  deckName: string;
}): void => {
  const blobPart = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobPart).set(bytes);

  const blob = new Blob([blobPart], { type: MF_DECK_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildMfDeckFileName(deckName);
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};



export { buildMfDeckFileName, downloadBytesAsMfDeck };
