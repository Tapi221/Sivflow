import type { CardDisplayMode } from "@/types/domain/cardSet";



type CardLayoutMode = "stack" | "flip" | "split";
type SplitFallbackCardLayoutMode = "stack" | "flip";
type CardSetInteractionMode = "view" | "edit";



const DEFAULT_CARD_LAYOUT_MODE: CardLayoutMode = "flip";
const DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE: SplitFallbackCardLayoutMode = "flip";
const CARD_LAYOUT_MODE_LABELS: Record<CardLayoutMode, string> = { stack: "縦並び", flip: "裏表", split: "2カラム" };



const resolveDefaultCardLayoutMode = (_interactionMode: CardSetInteractionMode): CardLayoutMode => {
  return DEFAULT_CARD_LAYOUT_MODE;
};
const normalizeCardLayoutMode = (value: unknown): CardLayoutMode => {
  if (value === "stack" || value === "split") {
    return value;
  }

  return "flip";
};
const normalizeSplitFallbackCardLayoutMode = (value: unknown): SplitFallbackCardLayoutMode => {
  return value === "stack" ? "stack" : "flip";
};
const buildCardLayoutPreferenceScopeKey = ({ deviceScope, cardSetId, displayMode, interactionMode }: { deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
}) => {
  return [
    deviceScope || "unknown",
    cardSetId || "__no_card_set__",
    displayMode,
    interactionMode,
  ].join("::");
};



export { DEFAULT_CARD_LAYOUT_MODE, DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE, resolveDefaultCardLayoutMode, normalizeCardLayoutMode, normalizeSplitFallbackCardLayoutMode, buildCardLayoutPreferenceScopeKey, CARD_LAYOUT_MODE_LABELS };


export type { CardLayoutMode, SplitFallbackCardLayoutMode, CardSetInteractionMode };
