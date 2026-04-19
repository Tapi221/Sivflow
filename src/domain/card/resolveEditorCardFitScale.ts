import {
  CANONICAL_CARD_WIDTH,
  CARD_PANE_AUTO_MAX_SCALE,
} from "@constants/shared/flashcard";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";

type ResolveEditorCardFitScaleArgs = Readonly<{
  availablePaneWidthPx: number;
  canonicalCardWidth?: number;
  cardLayoutMode: CardLayoutMode;
  splitGapPx?: number;
}>;

export const resolveEditorCardFitScale = ({
  availablePaneWidthPx,
  canonicalCardWidth = CANONICAL_CARD_WIDTH,
  cardLayoutMode,
  splitGapPx = 0,
}: ResolveEditorCardFitScaleArgs) => {
  if (!Number.isFinite(availablePaneWidthPx) || availablePaneWidthPx <= 0) {
    return 1;
  }

  const editorCardTargetWidthPx =
    cardLayoutMode === "split"
      ? Math.max(1, (availablePaneWidthPx - splitGapPx) / 2)
      : Math.max(1, availablePaneWidthPx);

  return Math.max(
    0.1,
    Math.min(
      CARD_PANE_AUTO_MAX_SCALE,
      editorCardTargetWidthPx / Math.max(1, canonicalCardWidth),
    ),
  );
};
