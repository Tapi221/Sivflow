import type { CardDisplayMode } from "@/types/domain/cardSet";

export type CardLayoutMode = "stack" | "flip" | "split";
export type SplitFallbackCardLayoutMode = "stack" | "flip";
export type CardSetInteractionMode = "view" | "edit";

export const DEFAULT_CARD_LAYOUT_MODE: CardLayoutMode = "flip";
export const DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE: SplitFallbackCardLayoutMode = "flip";

export const resolveDefaultCardLayoutMode = (_interactionMode: CardSetInteractionMode): CardLayoutMode => {
  return DEFAULT_CARD_LAYOUT_MODE;
};

export const normalizeCardLayoutMode = (value: unknown): CardLayoutMode => {
  if (value === "stack" || value === "split") return value;
  return "flip";
};

export const normalizeSplitFallbackCardLayoutMode = (value: unknown): SplitFallbackCardLayoutMode => {
  return value === "stack" ? "stack" : "flip";
};

export const buildCardLayoutPreferenceScopeKey = ({ deviceScope, cardSetId, displayMode, interactionMode }: { deviceScope: string; cardSetId: string | null | undefined; displayMode: CardDisplayMode; interactionMode: CardSetInteractionMode }) => {
  return [deviceScope || "unknown", cardSetId || "__no_card_set__", displayMode, interactionMode].join("::");
};

export const CARD_LAYOUT_MODE_LABELS: Record<CardLayoutMode, string> = {
  stack: "縦並び",
  flip: "裏表",
  split: "2カラム",
};
