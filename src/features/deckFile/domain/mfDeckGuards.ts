import type { MfDeckArchiveV1, MfDeckCardsJsonV1, MfDeckIssue, MfDeckManifestV1, MfDeckMediaManifestV1, MfDeckValidationResult } from "./mfDeck.types";
import { MF_DECK_FORMAT, MF_DECK_MAX_BLOCKS_PER_FACE, MF_DECK_MAX_CARDS, MF_DECK_MAX_MEDIA_ENTRIES, MF_DECK_MEDIA_MANIFEST_PATH, MF_DECK_VERSION } from "./mfDeck.types";
import { isMfDeckMediaPath } from "./mfDeckMedia";



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};
const isIsoLikeString = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) return false;
  return !Number.isNaN(Date.parse(value));
};
const isDisplayMode = (value: unknown): value is "fixed" | "fluid" => {
  return value === "fixed" || value === "fluid";
};
const isMediaKind = (
  value: unknown,
): value is "image" | "audio" | "unknown" => {
  return value === "image" || value === "audio" || value === "unknown";
};
const isCardBlock = (
  value: unknown,
): value is MfDeckCardsJsonV1["cards"][number]["front"]["blocks"][number] => {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.type)) return false;
  return (
    typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex)
  );
};
const isCardFace = (
  value: unknown,
): value is MfDeckCardsJsonV1["cards"][number]["front"] => {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.blocks)) return false;
  return value.blocks.every(isCardBlock);
};
const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
};
const pushDuplicateBlockIssues = (
  issues: MfDeckIssue[],
  card: MfDeckCardsJsonV1["cards"][number],
): void => {
  const seen = new Set<string>();

  for (const face of [card.front, card.back]) {
    for (const block of face.blocks) {
      if (seen.has(block.id)) {
        issues.push({
          level: "error",
          code: "duplicate_block_id",
          cardId: card.id,
          blockId: block.id,
          message:
            "同一カード内に重複した block id が含まれています。parentBlockId の解決が壊れるため読み込めません。",
        });
        continue;
      }

      seen.add(block.id);
    }
  }
};
const pushCardLimitIssues = (
  issues: MfDeckIssue[],
  cardsJson: MfDeckCardsJsonV1,
): void => {
  if (cardsJson.cards.length > MF_DECK_MAX_CARDS) {
    issues.push({
      level: "error",
      code: "too_many_cards",
      path: "cards.json",
      message: `cards.json のカード数が上限 ${MF_DECK_MAX_CARDS} 件を超えています。`,
    });
  }

  for (const card of cardsJson.cards) {
    if (card.front.blocks.length > MF_DECK_MAX_BLOCKS_PER_FACE) {
      issues.push({
        level: "error",
        code: "too_many_blocks",
        cardId: card.id,
        path: "cards.json",
        message: `front のブロック数が上限 ${MF_DECK_MAX_BLOCKS_PER_FACE} 件を超えています。`,
      });
    }

    if (card.back.blocks.length > MF_DECK_MAX_BLOCKS_PER_FACE) {
      issues.push({
        level: "error",
        code: "too_many_blocks",
        cardId: card.id,
        path: "cards.json",
        message: `back のブロック数が上限 ${MF_DECK_MAX_BLOCKS_PER_FACE} 件を超えています。`,
      });
    }
  }
};
const pushDuplicateCardIssues = (
  issues: MfDeckIssue[],
  cardsJson: MfDeckCardsJsonV1,
): void => {
  const seen = new Set<string>();

  for (const card of cardsJson.cards) {
    if (seen.has(card.id)) {
      issues.push({
        level: "error",
        code: "duplicate_card_id",
        path: "cards.json",
        cardId: card.id,
        message:
          "cards.json に重複した card id が含まれています。デッキの同一性が曖昧になるため読み込めません。",
      });
      continue;
    }

    seen.add(card.id);
    pushDuplicateBlockIssues(issues, card);
  }
};
const pushMediaManifestIssues = (
  issues: MfDeckIssue[],
  mediaManifest: MfDeckMediaManifestV1 | undefined,
  media?: Record<string, Uint8Array>,
): void => {
  if (!mediaManifest) return;

  if (mediaManifest.media.length > MF_DECK_MAX_MEDIA_ENTRIES) {
    issues.push({
      level: "error",
      code: "too_many_media_entries",
      path: MF_DECK_MEDIA_MANIFEST_PATH,
      message: `media/manifest.json のメディア件数が上限 ${MF_DECK_MAX_MEDIA_ENTRIES} 件を超えています。`,
    });
  }

  const seenPaths = new Set<string>();

  for (const entry of mediaManifest.media) {
    if (seenPaths.has(entry.path)) {
      issues.push({
        level: "error",
        code: "duplicate_media_path",
        path: entry.path,
        message: "media/manifest.json に重複した media path が含まれています。",
      });
      continue;
    }

    seenPaths.add(entry.path);

    const bytes = media?.[entry.path];
    if (!bytes) {
      issues.push({
        level: "warning",
        code: "missing_media",
        path: entry.path,
        message: `${entry.path} が見つかりません。該当メディア参照は復元できません。`,
      });
      continue;
    }

    if (entry.sizeBytes !== bytes.byteLength) {
      issues.push({
        level: "warning",
        code: "media_size_mismatch",
        path: entry.path,
        message: `${entry.path} の sizeBytes と実データサイズが一致しません。実データを正として扱います。`,
      });
    }
  }

  for (const mediaPath of Object.keys(media ?? {})) {
    if (!seenPaths.has(mediaPath)) {
      issues.push({
        level: "warning",
        code: "unknown_media_entry",
        path: mediaPath,
        message:
          "media/manifest.json に存在しないメディアファイルが含まれています。参照が無ければ無視されます。",
      });
    }
  }
};
const isMfDeckManifestV1 = (value: unknown): value is MfDeckManifestV1 => {
  if (!isRecord(value)) return false;
  if (value.format !== MF_DECK_FORMAT) return false;
  if (value.version !== MF_DECK_VERSION) return false;
  if (!isIsoLikeString(value.exportedAt)) return false;
  if (!isRecord(value.app)) return false;
  if (value.app.name !== "Sivflow") return false;
  if (
    value.app.version !== undefined &&
    typeof value.app.version !== "string"
  ) {
    return false;
  }
  if (!isRecord(value.deck)) return false;
  if (!isNonEmptyString(value.deck.id)) return false;
  if (!isNonEmptyString(value.deck.name)) return false;
  if (
    value.deck.description !== undefined &&
    typeof value.deck.description !== "string"
  ) {
    return false;
  }
  if (
    typeof value.deck.cardCount !== "number" ||
    !Number.isInteger(value.deck.cardCount) ||
    value.deck.cardCount < 0 ||
    value.deck.cardCount > MF_DECK_MAX_CARDS
  ) {
    return false;
  }
  if (
    value.deck.defaultDisplayMode !== undefined &&
    !isDisplayMode(value.deck.defaultDisplayMode)
  ) {
    return false;
  }

  if (value.capabilities !== undefined) {
    if (!isRecord(value.capabilities)) return false;
    if (
      typeof value.capabilities.mediaBundled !== "boolean" ||
      typeof value.capabilities.tagNames !== "boolean" ||
      typeof value.capabilities.reviewProgressIncluded !== "boolean"
    ) {
      return false;
    }
  }

  return true;
};
const isMfDeckCardsJsonV1 = (value: unknown): value is MfDeckCardsJsonV1 => {
  if (!isRecord(value)) return false;
  if (value.format !== "sivflow.deck.cards") return false;
  if (value.version !== MF_DECK_VERSION) return false;
  if (!Array.isArray(value.cards)) return false;
  return value.cards.every((card) => {
    if (!isRecord(card)) return false;
    if (!isNonEmptyString(card.id)) return false;
    if (
      card.sourceCardId !== undefined &&
      typeof card.sourceCardId !== "string"
    ) {
      return false;
    }
    if (
      card.questionNumber !== undefined &&
      typeof card.questionNumber !== "string"
    ) {
      return false;
    }
    if (card.title !== undefined && typeof card.title !== "string") {
      return false;
    }
    if (
      typeof card.orderIndex !== "number" ||
      !Number.isFinite(card.orderIndex)
    ) {
      return false;
    }
    if (card.tagNames !== undefined && !isStringArray(card.tagNames)) {
      return false;
    }
    if (!isCardFace(card.front)) return false;
    if (!isCardFace(card.back)) return false;
    if (card.flags !== undefined && !isRecord(card.flags)) return false;

    return true;
  });
};
const isMfDeckMediaManifestV1 = (value: unknown): value is MfDeckMediaManifestV1 => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (value.format !== "sivflow.deck.media") return false;
  if (value.version !== MF_DECK_VERSION) return false;
  if (!Array.isArray(value.media)) return false;
  return value.media.every((entry) => {
    if (!isRecord(entry)) return false;
    if (!isNonEmptyString(entry.path) || !isMfDeckMediaPath(entry.path)) {
      return false;
    }
    if (!isMediaKind(entry.kind)) return false;
    if (!isNonEmptyString(entry.mimeType)) return false;
    if (
      typeof entry.sizeBytes !== "number" ||
      !Number.isInteger(entry.sizeBytes) ||
      entry.sizeBytes < 0
    ) {
      return false;
    }
    if (
      entry.sourceName !== undefined &&
      typeof entry.sourceName !== "string"
    ) {
      return false;
    }
    if (
      entry.sourceUrlHash !== undefined &&
      typeof entry.sourceUrlHash !== "string"
    ) {
      return false;
    }

    return true;
  });
};
const validateMfDeckArchive = (input: { manifest: unknown;
  cardsJson: unknown;
  mediaManifest?: unknown;
  media?: Record<string, Uint8Array>;
}): MfDeckValidationResult => {
  const issues: MfDeckIssue[] = [];

  if (!isMfDeckManifestV1(input.manifest)) {
    issues.push({
      level: "error",
      code: "invalid_manifest",
      path: "manifest.json",
      message: "manifest.json の形式が mfdeck v1 と一致しません。",
    });
  }

  if (!isMfDeckCardsJsonV1(input.cardsJson)) {
    issues.push({
      level: "error",
      code: "invalid_cards",
      path: "cards.json",
      message: "cards.json の形式が mfdeck v1 と一致しません。",
    });
  }

  if (!isMfDeckMediaManifestV1(input.mediaManifest)) {
    issues.push({
      level: "error",
      code: "invalid_media_manifest",
      path: MF_DECK_MEDIA_MANIFEST_PATH,
      message: "media/manifest.json の形式が mfdeck v1 と一致しません。",
    });
  }

  if (issues.some((issue) => issue.level === "error")) {
    return { ok: false, issues };
  }

  const manifest = input.manifest as MfDeckManifestV1;
  const cardsJson = input.cardsJson as MfDeckCardsJsonV1;
  const mediaManifest = input.mediaManifest as
    | MfDeckMediaManifestV1
    | undefined;

  if (manifest.deck.cardCount !== cardsJson.cards.length) {
    issues.push({
      level: "warning",
      code: "card_count_mismatch",
      path: "manifest.json",
      message: `manifest の cardCount=${manifest.deck.cardCount} と cards.json の件数=${cardsJson.cards.length} が一致しません。cards.json を正として扱います。`,
    });
  }

  if (cardsJson.cards.length === 0) {
    issues.push({
      level: "warning",
      code: "empty_deck",
      path: "cards.json",
      message: "このデッキにはカードが含まれていません。",
    });
  }

  pushCardLimitIssues(issues, cardsJson);
  pushDuplicateCardIssues(issues, cardsJson);
  pushMediaManifestIssues(issues, mediaManifest, input.media);

  if (issues.some((issue) => issue.level === "error")) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      manifest,
      cardsJson,
      ...(mediaManifest ? { mediaManifest } : {}),
      ...(input.media ? { media: input.media } : {}),
    } satisfies MfDeckArchiveV1,
    issues,
  };
};



export { isMfDeckManifestV1, isMfDeckCardsJsonV1, isMfDeckMediaManifestV1, validateMfDeckArchive };
