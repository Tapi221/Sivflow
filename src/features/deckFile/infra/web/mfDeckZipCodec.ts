import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { MfDeckArchiveV1 } from "@/features/deckFile/domain/mfDeck.types";
import { MF_DECK_CARDS_PATH, MF_DECK_MANIFEST_PATH, MF_DECK_MEDIA_DIRECTORY, MF_DECK_MEDIA_MANIFEST_PATH, MfDeckValidationError } from "@/features/deckFile/domain/mfDeck.types";
import { validateMfDeckArchive } from "@/features/deckFile/domain/mfDeckGuards";
import { isMfDeckMediaPath, MF_DECK_MAX_MEDIA_ENTRY_BYTES, MF_DECK_MAX_MEDIA_TOTAL_BYTES } from "@/features/deckFile/domain/mfDeckMedia";



const MF_DECK_MAX_FILE_BYTES = 128 * 1024 * 1024;
const MF_DECK_MAX_JSON_BYTES = 24 * 1024 * 1024;



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
        code:
          path === MF_DECK_MANIFEST_PATH ? "missing_manifest" : "missing_cards",
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
const readOptionalTextEntry = (
  entries: Record<string, Uint8Array>,
  path: typeof MF_DECK_MEDIA_MANIFEST_PATH,
): string | undefined => {
  const entry = entries[path];
  if (!entry) return undefined;

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
const collectMediaEntries = (
  entries: Record<string, Uint8Array>,
): Record<string, Uint8Array> | undefined => {
  const media: Record<string, Uint8Array> = {};
  let totalBytes = 0;

  for (const [path, entry] of Object.entries(entries)) {
    if (!path.startsWith(MF_DECK_MEDIA_DIRECTORY)) continue;
    if (path === MF_DECK_MEDIA_MANIFEST_PATH) continue;
    if (!isMfDeckMediaPath(path)) continue;

    if (entry.byteLength > MF_DECK_MAX_MEDIA_ENTRY_BYTES) {
      throw new MfDeckValidationError(`${path} が大きすぎます。`, [
        {
          level: "error",
          code: "file_too_large",
          path,
          message: `${path} が大きすぎます。`,
        },
      ]);
    }

    totalBytes += entry.byteLength;
    if (totalBytes > MF_DECK_MAX_MEDIA_TOTAL_BYTES) {
      throw new MfDeckValidationError(
        "mfdeck 内のメディア合計サイズが大きすぎます。",
        [
          {
            level: "error",
            code: "file_too_large",
            message: "mfdeck 内のメディア合計サイズが大きすぎます。",
          },
        ],
      );
    }

    media[path] = entry;
  }

  return Object.keys(media).length > 0 ? media : undefined;
};
const encodeMfDeckArchive = (archive: MfDeckArchiveV1): Uint8Array => {
  const validation = validateMfDeckArchive(archive);

  if (!validation.ok) {
    throw new MfDeckValidationError(
      "mfdeck の作成前検証に失敗しました。",
      validation.issues,
    );
  }

  const entries: Record<string, Uint8Array> = {
    [MF_DECK_MANIFEST_PATH]: strToU8(JSON.stringify(archive.manifest, null, 2)),
    [MF_DECK_CARDS_PATH]: strToU8(JSON.stringify(archive.cardsJson, null, 2)),
  };

  if (archive.mediaManifest) {
    entries[MF_DECK_MEDIA_MANIFEST_PATH] = strToU8(
      JSON.stringify(archive.mediaManifest, null, 2),
    );
  }

  let totalMediaBytes = 0;

  if (archive.media) {
    for (const [path, bytes] of Object.entries(archive.media)) {
      if (!isMfDeckMediaPath(path)) {
        throw new MfDeckValidationError(
          "安全でないメディアパスを含む mfdeck です。",
          [
            {
              level: "error",
              code: "unsafe_path",
              path,
              message: "安全でないメディアパスを含む mfdeck です。",
            },
          ],
        );
      }

      if (bytes.byteLength > MF_DECK_MAX_MEDIA_ENTRY_BYTES) {
        throw new MfDeckValidationError(`${path} が大きすぎます。`, [
          {
            level: "error",
            code: "file_too_large",
            path,
            message: `${path} が大きすぎます。`,
          },
        ]);
      }

      totalMediaBytes += bytes.byteLength;

      if (totalMediaBytes > MF_DECK_MAX_MEDIA_TOTAL_BYTES) {
        throw new MfDeckValidationError(
          "mfdeck 内のメディア合計サイズが大きすぎます。",
          [
            {
              level: "error",
              code: "file_too_large",
              message: "mfdeck 内のメディア合計サイズが大きすぎます。",
            },
          ],
        );
      }

      entries[path] = bytes;
    }
  }

  return zipSync(entries, {
    level: 6,
    mtime: new Date(Date.UTC(1980, 0, 1, 0, 0, 0)),
  });
};
const decodeMfDeckArchive = (buffer: ArrayBuffer): MfDeckArchiveV1 => {
  if (buffer.byteLength > MF_DECK_MAX_FILE_BYTES) {
    throw new MfDeckValidationError("mfdeck ファイルが大きすぎます。", [{ level: "error", code: "file_too_large", message: "mfdeck ファイルが大きすぎます。" }]);
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
  const mediaManifestText = readOptionalTextEntry(
    entries,
    MF_DECK_MEDIA_MANIFEST_PATH,
  );
  const media = collectMediaEntries(entries);

  const validation = validateMfDeckArchive({
    manifest: parseJsonEntry(manifestText, MF_DECK_MANIFEST_PATH),
    cardsJson: parseJsonEntry(cardsText, MF_DECK_CARDS_PATH),
    mediaManifest: mediaManifestText
      ? parseJsonEntry(mediaManifestText, MF_DECK_MEDIA_MANIFEST_PATH)
      : undefined,
    media,
  });

  if (!validation.ok) {
    throw new MfDeckValidationError(
      "mfdeck の検証に失敗しました。",
      validation.issues,
    );
  }

  return validation.value;
};



export { MF_DECK_MAX_FILE_BYTES, MF_DECK_MAX_JSON_BYTES, encodeMfDeckArchive, decodeMfDeckArchive };
