import type { MfCardFileV1, MfCardIssue, MfCardValidationResult } from "./mfCard.types";
import { MF_CARD_FORMAT, MF_CARD_VERSION } from "./mfCard.types";
import { MF_DECK_VERSION } from "@/features/deckFile/domain/mfDeck.types";
import { isMfDeckCardsJsonV1 } from "@/features/deckFile/domain/mfDeckGuards";



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
const isMfCardPayloadV1 = (value: unknown): value is MfCardFileV1["card"] => {
  return isMfDeckCardsJsonV1({
    format: "sivflow.deck.cards",
    version: MF_DECK_VERSION,
    cards: [value],
  });
};
const isMfCardFileV1 = (value: unknown): value is MfCardFileV1 => {
  if (!isRecord(value)) return false;
  if (value.format !== MF_CARD_FORMAT) return false;
  if (value.version !== MF_CARD_VERSION) return false;
  if (!isIsoLikeString(value.exportedAt)) return false;
  if (!isRecord(value.app)) return false;
  if (value.app.name !== "Sivflow") return false;
  if (
    value.app.version !== undefined &&
    typeof value.app.version !== "string"
  ) {
    return false;
  }

  return isMfCardPayloadV1(value.card);
};
const validateMfCardFile = (input: unknown): MfCardValidationResult => {
  const issues: MfCardIssue[] = [];

  if (!isMfCardFileV1(input)) {
    issues.push({
      level: "error",
      code: "invalid_format",
      path: "card.json",
      message: "mfcard v1 の形式と一致しません。",
    });

    return { ok: false, issues };
  }

  return {
    ok: true,
    value: input,
    issues,
  };
};



export { isMfCardFileV1, validateMfCardFile };
