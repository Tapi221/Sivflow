import type { CardDisplayMode } from "@/types/domain/cardSet";
import { DEFAULT_CARD_DISPLAY_MODE, normalizeCardDisplayMode } from "@/types/domain/cardSet";



const currentDisplayModeByCardSet = new Map<string, CardDisplayMode>();



const getCardSetSessionDisplayMode = (cardSetId: string | null | undefined) => {
  if (!cardSetId) return null;
  return currentDisplayModeByCardSet.get(cardSetId) ?? null;
};
const resolveCardSetDisplayMode = (cardSetId: string | null | undefined, defaultDisplayMode: unknown) => {
  const currentDisplayMode = getCardSetSessionDisplayMode(cardSetId);
  if (currentDisplayMode) return currentDisplayMode;
  if (!cardSetId) return DEFAULT_CARD_DISPLAY_MODE;
  return normalizeCardDisplayMode(defaultDisplayMode);
};
const setCardSetSessionDisplayMode = (cardSetId: string | null | undefined, mode: CardDisplayMode) => {
  if (!cardSetId) return;
  currentDisplayModeByCardSet.set(cardSetId, mode);
};



export { getCardSetSessionDisplayMode, resolveCardSetDisplayMode, setCardSetSessionDisplayMode };
