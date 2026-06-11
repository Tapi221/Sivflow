import { MF_CARD_FILE_EXTENSION, MF_CARD_MIME_TYPE } from "@/features/cardFile/domain/mfCard.types";



const INVALID_FILE_NAME_CHARACTERS = new Set(["\\", "/", ":", "*", "?", "\"", "<", ">", "|"]);



const sanitizeFileName = (name: string) => {
  const trimmed = name.trim() ?? "sivflow-card";
  const sanitized = Array.from(trimmed, (char) =>
    INVALID_FILE_NAME_CHARACTERS.has(char) ? "_" : char,
  ).join("");
  return sanitized.slice(0, 120);
};
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};
const downloadBytesAsMfCard = ({ bytes, cardName }: { bytes: Uint8Array;
  cardName: string;
}) => {
  const blob = new Blob([toArrayBuffer(bytes)], {
    type: MF_CARD_MIME_TYPE,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${sanitizeFileName(cardName)}${MF_CARD_FILE_EXTENSION}`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};



export { downloadBytesAsMfCard };
