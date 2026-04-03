import {
  DEFAULT_CARD_DISPLAY_MODE,
  normalizeCardDisplayMode,
  type CardDisplayMode,
} from "@/types/domain/cardSet";

const currentDisplayModeByCardSet = new Map<string, CardDisplayMode>();

export function getCardSetSessionDisplayMode(
  cardSetId: string | null | undefined,
): CardDisplayMode | null {
  if (!cardSetId) return null;
  return currentDisplayModeByCardSet.get(cardSetId) ?? null;
}

export function resolveCardSetDisplayMode(
  cardSetId: string | null | undefined,
  defaultDisplayMode: unknown,
): CardDisplayMode {
  const currentDisplayMode = getCardSetSessionDisplayMode(cardSetId);
  if (currentDisplayMode) return currentDisplayMode;
  if (!cardSetId) return DEFAULT_CARD_DISPLAY_MODE;
  return normalizeCardDisplayMode(defaultDisplayMode);
}

export function setCardSetSessionDisplayMode(
  cardSetId: string | null | undefined,
  mode: CardDisplayMode,
): void {
  if (!cardSetId) return;
  currentDisplayModeByCardSet.set(cardSetId, mode);
}

