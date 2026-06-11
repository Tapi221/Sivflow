import type { MfDeckIssue, MfDeckMediaManifestV1 } from "@/features/deckFile/domain/mfDeck.types";
import { isMfDeckMediaUri, pathFromMfDeckMediaUri } from "@/features/deckFile/domain/mfDeckMedia";
import type { CardBlock } from "@/types";



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
const bytesToBase64 = (bytes: Uint8Array): string => {
  const maybeBuffer = (
    globalThis as {
      Buffer?: {
        from: (input: Uint8Array) => {
          toString: (encoding: "base64") => string;
        };
      };
    }
  ).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }

  return btoa(binary);
};
const buildMediaLookup = (
  mediaManifest?: MfDeckMediaManifestV1,
): Map<string, { mimeType: string; }> => {
  const lookup = new Map<string, { mimeType: string; }>();

  for (const entry of mediaManifest?.media ?? []) {
    lookup.set(entry.path, { mimeType: entry.mimeType });
  }

  return lookup;
};
const buildDataUrl = (input: {
  bytes: Uint8Array;
  mimeType: string;
}): string => {
  return `data:${input.mimeType};base64,${bytesToBase64(input.bytes)}`;
};
const restoreRecordUrl = (input: {
  record: Record<string, unknown>;
  key: string;
  media?: Record<string, Uint8Array>;
  mediaLookup: Map<string, { mimeType: string; }>;
  issues: MfDeckIssue[];
  cardId?: string;
  blockId?: string;
}): void => {
  const value = input.record[input.key];
  if (!isMfDeckMediaUri(value)) return;

  const path = pathFromMfDeckMediaUri(value);
  if (!path) {
    input.issues.push({
      level: "warning",
      code: "unsafe_path",
      cardId: input.cardId,
      blockId: input.blockId,
      message: "安全でないメディア参照をスキップしました。",
    });
    delete input.record[input.key];
    return;
  }

  const bytes = input.media?.[path];
  const metadata = input.mediaLookup.get(path);

  if (!bytes || !metadata) {
    input.issues.push({
      level: "warning",
      code: "missing_media",
      cardId: input.cardId,
      blockId: input.blockId,
      path,
      message: `${path} が見つからないためメディア参照を復元できませんでした。`,
    });
    delete input.record[input.key];
    return;
  }

  input.record[input.key] = buildDataUrl({
    bytes,
    mimeType: metadata.mimeType,
  });
};
const restoreRecordMediaUrls = (input: {
  record: Record<string, unknown>;
  media?: Record<string, Uint8Array>;
  mediaLookup: Map<string, { mimeType: string; }>;
  issues: MfDeckIssue[];
  cardId?: string;
  blockId?: string;
}): void => {
  ["localUrl", "remoteUrl", "url"].forEach((key) => {
    restoreRecordUrl({ ...input, key });
  });
};
const restoreBlockMedia = (input: {
  block: CardBlock;
  media?: Record<string, Uint8Array>;
  mediaLookup: Map<string, { mimeType: string; }>;
  issues: MfDeckIssue[];
  cardId?: string;
}): void => {
  const blockRecord = input.block as unknown as Record<string, unknown>;

  if (Array.isArray(blockRecord.images)) {
    blockRecord.images.forEach((image) => {
      if (!isRecord(image)) return;
      restoreRecordMediaUrls({
        record: image,
        media: input.media,
        mediaLookup: input.mediaLookup,
        issues: input.issues,
        cardId: input.cardId,
        blockId: input.block.id,
      });
    });
  }

  if (Array.isArray(blockRecord.audios)) {
    blockRecord.audios.forEach((audio) => {
      if (!isRecord(audio)) return;
      restoreRecordMediaUrls({
        record: audio,
        media: input.media,
        mediaLookup: input.mediaLookup,
        issues: input.issues,
        cardId: input.cardId,
        blockId: input.block.id,
      });
    });
  }
};
const restoreMfDeckMediaInBlocks = (input: { blocks: CardBlock[];
  media?: Record<string, Uint8Array>;
  mediaManifest?: MfDeckMediaManifestV1;
  issues: MfDeckIssue[];
  cardId?: string;
}): CardBlock[] => {
  const mediaLookup = buildMediaLookup(input.mediaManifest);

  input.blocks.forEach((block) => {
    restoreBlockMedia({
      block,
      media: input.media,
      mediaLookup,
      issues: input.issues,
      cardId: input.cardId,
    });
  });

  return input.blocks;
};



export { restoreMfDeckMediaInBlocks };
