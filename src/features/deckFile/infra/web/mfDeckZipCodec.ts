import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import {
  MF_DECK_CARDS_PATH,
  MF_DECK_MANIFEST_PATH,
  type MfDeckArchiveV1,
  MfDeckValidationError,
} from "@/features/deckFile/domain/mfDeckTypes";
import { validateMfDeckArchive } from "@/features/deckFile/domain/mfDeckGuards";

export const MF_DECK_MAX_FILE_BYTES = 64 * 1024 * 1024;
export const MF_DECK_MAX_JSON_BYTES = 24 * 1024 * 1024;

const parseJsonEntry = (text: string, path: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MfDeckValidationError(`${path} のJSON解析に失敗しました。`, [
      {
        level: "error",
        code: "invalid_json",
        path,
        message: `${path} のJSON解析に失敗しました。`,
      },
    ]);
  }
};

const readRequiredTextEntry = (
  entries: Record<string, Uint8Array>,
  path: typeof MF_DECK_MANIFEST_PATH | typeof MF_DECK_CARDS_PATH,
): string => {
  const entry = entries[path];

  if (!entry) {
    throw new MfDeckValidationError(`${path} が見つかりません。`, [
      {
        level: "error",
        code: path === MF_DECK_MANIFEST_PATH ? "missing_manifest" : "missing_cards",
        path,
        message: `${path} が見つかりません。`,
      },
    ]);
  }

  if (entry.byteLength > MF_DECK_MAX_JSON_BYTES) {
    throw new MfDeckValidationError(`${path} が大きすぎます。`, [
      {
        level: "error",
        code: "file_too_large",
        path,
        message: `${path} が大きすぎます。`,
      },
    ]);
  }

  return strFromU8(entry);
};

export const encodeMfDeckArchive = (archive: MfDeckArchiveV1): Uint8Array => {
  return zipSync(
    {
      [MF_DECK_MANIFEST_PATH]: strToU8(
        JSON.stringify(archive.manifest, null, 2),
      ),
      [MF_DECK_CARDS_PATH]: strToU8(
        JSON.stringify(archive.cardsJson, null, 2),
      ),
    },
    {
      level: 6,
      mtime: new Date(Date.UTC(1980, 0, 1, 0, 0, 0)),
    },
  );
};

export const decodeMfDeckArchive = (buffer: ArrayBuffer): MfDeckArchiveV1 => {
  if (buffer.byteLength > MF_DECK_MAX_FILE_BYTES) {
    throw new MfDeckValidationError("mfdeck ファイルが大きすぎます。", [
      {
        level: "error",
        code: "file_too_large",
        message: "mfdeck ファイルが大きすぎます。",
      },
    ]);
  }

  let entries: Record<string, Uint8Array>;

  try {
    entries = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new MfDeckValidationError("mfdeck ZIP の展開に失敗しました。", [
      {
        level: "error",
        code: "invalid_zip",
        message: "mfdeck ZIP の展開に失敗しました。",
      },
    ]);
  }

  const unsafePath = Object.keys(entries).find((path) => {
    return path.startsWith("/") || path.includes("..") || path.includes("\\");
  });

  if (unsafePath) {
    throw new MfDeckValidationError("安全でないパスを含む mfdeck です。", [
      {
        level: "error",
        code: "unsafe_path",
        path: unsafePath,
        message: "安全でないパスを含む mfdeck です。",
      },
    ]);
  }

  const manifestText = readRequiredTextEntry(entries, MF_DECK_MANIFEST_PATH);
  const cardsText = readRequiredTextEntry(entries, MF_DECK_CARDS_PATH);

  const validation = validateMfDeckArchive({
    manifest: parseJsonEntry(manifestText, MF_DECK_MANIFEST_PATH),
    cardsJson: parseJsonEntry(cardsText, MF_DECK_CARDS_PATH),
  });

  if (!validation.ok) {
    throw new MfDeckValidationError(
      "mfdeck の検証に失敗しました。",
      validation.issues,
    );
  }

  return validation.value;
};
