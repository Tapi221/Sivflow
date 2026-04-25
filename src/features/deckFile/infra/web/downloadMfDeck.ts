import {
  MF_DECK_FILE_EXTENSION,
  MF_DECK_MIME_TYPE,
} from "@/features/deckFile/domain/mfDeckTypes";

const sanitizeFileNamePart = (value: string): string => {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_");
  return sanitized || "manifolia-deck";
};

export const buildMfDeckFileName = (deckName: string): string => {
  const baseName = sanitizeFileNamePart(deckName).replace(
    new RegExp(`${MF_DECK_FILE_EXTENSION}$`, "i"),
    "",
  );

  return `${baseName}${MF_DECK_FILE_EXTENSION}`;
};

export const downloadBytesAsMfDeck = ({
  bytes,
  deckName,
}: {
  bytes: Uint8Array;
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
