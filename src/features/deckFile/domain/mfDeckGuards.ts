import {
  MF_DECK_FORMAT,
  MF_DECK_VERSION,
  type MfDeckArchiveV1,
  type MfDeckCardsJsonV1,
  type MfDeckIssue,
  type MfDeckManifestV1,
  type MfDeckValidationResult,
} from "@/features/deckFile/domain/mfDeckTypes";

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

const isCardBlock = (value: unknown): value is MfDeckCardsJsonV1["cards"][number]["front"]["blocks"][number] => {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.type)) return false;
  return typeof value.orderIndex === "number" && Number.isFinite(value.orderIndex);
};

const isCardFace = (value: unknown): value is MfDeckCardsJsonV1["cards"][number]["front"] => {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.blocks)) return false;
  return value.blocks.every(isCardBlock);
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
};

export const isMfDeckManifestV1 = (
  value: unknown,
): value is MfDeckManifestV1 => {
  if (!isRecord(value)) return false;
  if (value.format !== MF_DECK_FORMAT) return false;
  if (value.version !== MF_DECK_VERSION) return false;
  if (!isIsoLikeString(value.exportedAt)) return false;
  if (!isRecord(value.app)) return false;
  if (value.app.name !== "Manifolia") return false;
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
    value.deck.cardCount < 0
  ) {
    return false;
  }
  if (
    value.deck.defaultDisplayMode !== undefined &&
    !isDisplayMode(value.deck.defaultDisplayMode)
  ) {
    return false;
  }

  return true;
};

export const isMfDeckCardsJsonV1 = (
  value: unknown,
): value is MfDeckCardsJsonV1 => {
  if (!isRecord(value)) return false;
  if (value.format !== "manifolia.deck.cards") return false;
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

export const validateMfDeckArchive = (input: {
  manifest: unknown;
  cardsJson: unknown;
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

  if (issues.some((issue) => issue.level === "error")) {
    return { ok: false, issues };
  }

  const manifest = input.manifest as MfDeckManifestV1;
  const cardsJson = input.cardsJson as MfDeckCardsJsonV1;

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

  return {
    ok: true,
    value: {
      manifest,
      cardsJson,
    } satisfies MfDeckArchiveV1,
    issues,
  };
};
