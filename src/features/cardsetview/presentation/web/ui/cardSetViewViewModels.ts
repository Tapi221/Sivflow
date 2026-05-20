import type { CardPaneMode } from "@constants/shared/flashcard";
import {
  DISPLAY_MODE_LABELS,
  DISPLAY_MODE_TRIGGER_LABELS,
} from "@constants/shared/flashcard";

import type { CardDisplayMode } from "@/types/domain/cardSet";

export type WidthControlViewModel = {
  modeLabel: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
  onReset: () => void;
};

export const resolveDisplayModeLabels = (
  currentDisplayMode: CardDisplayMode,
) => {
  return {
    currentLabel: DISPLAY_MODE_LABELS[currentDisplayMode],
    triggerLabel: DISPLAY_MODE_TRIGGER_LABELS[currentDisplayMode],
  };
};

export const buildWidthControl = ({
  isDesktop,
  isGlobalEditing,
  activePaneWidthPx,
  activePaneMinWidthPx,
  activePaneMaxWidthPx,
  activePaneDisplayedDefaultWidthPx,
  previewPaneWidth,
  persistPaneWidth,
  stepPaneWidth,
  resetActivePaneWidth,
  activePaneMode,
  widthStepPx,
}: {
  isDesktop: boolean;
  isGlobalEditing: boolean;
  activePaneWidthPx: number;
  activePaneMinWidthPx: number;
  activePaneMaxWidthPx: number;
  activePaneDisplayedDefaultWidthPx: number;
  previewPaneWidth: (mode: CardPaneMode, value: number) => void;
  persistPaneWidth: (mode: CardPaneMode, value: number) => void | Promise<void>;
  stepPaneWidth: (delta: number) => void;
  resetActivePaneWidth: () => void;
  activePaneMode: CardPaneMode;
  widthStepPx: number;
}): WidthControlViewModel | null => {
  if (!isDesktop || !isGlobalEditing) {
    return null;
  }

  return {
    modeLabel: "編集幅",
    value: activePaneWidthPx,
    min: activePaneMinWidthPx,
    max: activePaneMaxWidthPx,
    defaultValue: activePaneDisplayedDefaultWidthPx,
    onPreviewChange: (value: number) => {
      previewPaneWidth(activePaneMode, value);
    },
    onCommit: (value: number) => {
      void persistPaneWidth(activePaneMode, value);
    },
    onStepDown: () => {
      stepPaneWidth(-widthStepPx);
    },
    onStepUp: () => {
      stepPaneWidth(widthStepPx);
    },
    onReset: resetActivePaneWidth,
  };
};
