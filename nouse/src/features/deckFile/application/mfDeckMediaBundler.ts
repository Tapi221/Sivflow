import type { MfDeckIssue, MfDeckMediaEntryV1, MfDeckMediaManifestV1 } from "@/features/deckFile/domain/mfDeck.types";
import { buildMfDeckMediaManifest, buildMfDeckMediaPath, inferMfDeckMediaExtension, inferMfDeckMediaKind, MF_DECK_MAX_MEDIA_ENTRY_BYTES, MF_DECK_MAX_MEDIA_TOTAL_BYTES, toMfDeckMediaUri } from "@/features/deckFile/domain/mfDeckMedia";
import type { CardBlock } from "@/types";



type MfDeckMediaBundle = {
  media: Record<string, Uint8Array>;
  mediaManifest?: MfDeckMediaManifestV1;
  issues: MfDeckIssue[];
};
type MediaCandidate = {
  record: Record<string, unknown>;
  urlKey: "localUrl" | "remoteUrl" | "url";
  url: string;
  kindHint: "image" | "audio" | "unknown";
  sourceName?: string;
  cardId?: string;
  blockId?: string;
};
type BundleMediaInCardsParams<
  TCard extends { id?: string; front?: unknown; back?: unknown; },
> = {
  cards: TCard[];
};



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
const asRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
};
const resolveCandidateUrl = (
  record: Record<string, unknown>,
): Pick<MediaCandidate, "url" | "urlKey"> | null => {
  const localUrl = record.localUrl;
  if (typeof localUrl === "string" && localUrl.trim()) {
    return { url: localUrl, urlKey: "localUrl" };
  }

  const remoteUrl = record.remoteUrl;
  if (typeof remoteUrl === "string" && remoteUrl.trim()) {
    return { url: remoteUrl, urlKey: "remoteUrl" };
  }

  const url = record.url;
  if (typeof url === "string" && url.trim()) {
    return { url, urlKey: "url" };
  }

  return null;
};
const resolveSourceName = (
  record: Record<string, unknown>,
  fallback: string,
): string => {
  const candidates = [record.filename, record.name, record.id, record.assetId];
  const found = candidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  return found?.trim() || fallback;
};
const collectBlockCandidates = (input: {
  cardId?: string;
  block: CardBlock;
  candidates: MediaCandidate[];
}): void => {
  const { cardId, block, candidates } = input;
  const blockRecord = block as unknown as Record<string, unknown>;

  if (block.type === "image") {
    asRecordArray(blockRecord.images).forEach((image, index) => {
      const resolved = resolveCandidateUrl(image);
      if (!resolved) return;

      candidates.push({
        record: image,
        url: resolved.url,
        urlKey: resolved.urlKey,
        kindHint: "image",
        sourceName: resolveSourceName(image, `image-${index + 1}`),
        cardId,
        blockId: block.id,
      });
    });
  }

  if (block.type === "audio") {
    asRecordArray(blockRecord.audios).forEach((audio, index) => {
      const resolved = resolveCandidateUrl(audio);
      if (!resolved) return;

      candidates.push({
        record: audio,
        url: resolved.url,
        urlKey: resolved.urlKey,
        kindHint: "audio",
        sourceName: resolveSourceName(audio, `audio-${index + 1}`),
        cardId,
        blockId: block.id,
      });
    });
  }
};
const collectFaceAttachmentCandidates = (input: {
  cardId?: string;
  face: unknown;
  candidates: MediaCandidate[];
}): void => {
  const { cardId, face, candidates } = input;
  if (!isRecord(face) || !isRecord(face.attachments)) return;

  asRecordArray(face.attachments.images).forEach((image, index) => {
    const resolved = resolveCandidateUrl(image);
    if (!resolved) return;

    candidates.push({
      record: image,
      url: resolved.url,
      urlKey: resolved.urlKey,
      kindHint: "image",
      sourceName: resolveSourceName(image, `attachment-image-${index + 1}`),
      cardId,
    });
  });

  asRecordArray(face.attachments.audios).forEach((audio, index) => {
    const resolved = resolveCandidateUrl(audio);
    if (!resolved) return;

    candidates.push({
      record: audio,
      url: resolved.url,
      urlKey: resolved.urlKey,
      kindHint: "audio",
      sourceName: resolveSourceName(audio, `attachment-audio-${index + 1}`),
      cardId,
    });
  });
};
const collectCandidates = <
  TCard extends { id?: string; front?: unknown; back?: unknown; },
>(
  cards: TCard[],
): MediaCandidate[] => {
  const candidates: MediaCandidate[] = [];

  cards.forEach((card) => {
    const faces = [card.front, card.back];

    faces.forEach((face) => {
      if (!isRecord(face)) return;

      if (Array.isArray(face.blocks)) {
        face.blocks.forEach((block) => {
          if (!isRecord(block)) return;
          collectBlockCandidates({
            cardId: card.id,
            block: block as unknown as CardBlock,
            candidates,
          });
        });
      }

      collectFaceAttachmentCandidates({ cardId: card.id, face, candidates });
    });
  });

  return candidates;
};
const fetchBytes = async (
  url: string,
): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`media fetch failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const mimeType =
    (response.headers.get("content-type")?.split(";")[0].trim() ||
    (url.startsWith("data:")
      ? url.slice(5, url.indexOf(";"))
      : "application/octet-stream")) ??
    "application/octet-stream";

  return {
    bytes: new Uint8Array(buffer),
    mimeType,
  };
};
const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const bundleMediaInMfDeckCards = async <TCard extends { id?: string; front?: unknown; back?: unknown; },
>({
  cards,
}: BundleMediaInCardsParams<TCard>): Promise<MfDeckMediaBundle> => {
  const candidates = collectCandidates(cards);
  const issues: MfDeckIssue[] = [];
  const media: Record<string, Uint8Array> = {};
  const mediaEntries: MfDeckMediaEntryV1[] = [];
  const sourceUrlToPath = new Map<string, string>();
  let totalBytes = 0;

  for (const candidate of candidates) {
    const reusablePath = sourceUrlToPath.get(candidate.url);
    if (reusablePath) {
      candidate.record[candidate.urlKey] = toMfDeckMediaUri(reusablePath);
      continue;
    }

    try {
      const fetched = await fetchBytes(candidate.url);

      if (fetched.bytes.byteLength > MF_DECK_MAX_MEDIA_ENTRY_BYTES) {
        issues.push({
          level: "warning",
          code: "file_too_large",
          cardId: candidate.cardId,
          blockId: candidate.blockId,
          message:
            "メディアが大きすぎるため .mfdeck への同梱をスキップしました。",
        });
        continue;
      }

      if (
        totalBytes + fetched.bytes.byteLength >
        MF_DECK_MAX_MEDIA_TOTAL_BYTES
      ) {
        issues.push({
          level: "warning",
          code: "file_too_large",
          cardId: candidate.cardId,
          blockId: candidate.blockId,
          message:
            "メディア合計サイズが上限を超えるため、以降のメディア同梱をスキップしました。",
        });
        continue;
      }

      const inferredKind = inferMfDeckMediaKind(fetched.mimeType);
      const kind =
        inferredKind === "unknown" ? candidate.kindHint : inferredKind;
      const extension = inferMfDeckMediaExtension({
        mimeType: fetched.mimeType,
        sourceName: candidate.sourceName,
        url: candidate.url,
      });
      const path = buildMfDeckMediaPath({
        index: mediaEntries.length + 1,
        kind,
        extension,
        sourceName: candidate.sourceName,
      });

      media[path] = fetched.bytes;
      mediaEntries.push({
        path,
        kind,
        mimeType: fetched.mimeType,
        sizeBytes: fetched.bytes.byteLength,
        sourceName: candidate.sourceName,
        sourceUrlHash: hashString(candidate.url),
      });
      sourceUrlToPath.set(candidate.url, path);
      candidate.record[candidate.urlKey] = toMfDeckMediaUri(path);
      totalBytes += fetched.bytes.byteLength;
    } catch {
      issues.push({
        level: "warning",
        code: "unreadable_media",
        cardId: candidate.cardId,
        blockId: candidate.blockId,
        message:
          "メディアを読み取れなかったため .mfdeck への同梱をスキップしました。",
      });
    }
  }

  return {
    media,
    mediaManifest:
      mediaEntries.length > 0
        ? buildMfDeckMediaManifest(mediaEntries)
        : undefined,
    issues,
  };
};



export { bundleMediaInMfDeckCards };


export type { MfDeckMediaBundle };
