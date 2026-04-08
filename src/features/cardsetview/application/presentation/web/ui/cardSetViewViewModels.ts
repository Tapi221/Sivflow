import type { CardDisplayMode } from "@/types/domain/cardSet";

import {
  DISPLAY_MODE_LABELS,
  DISPLAY_MODE_TRIGGER_LABELS,
} from "@/features/cardsetview/domain/cardSetViewConstants";
import { toTimeMs } from "@/features/cardsetview/domain/cardSetViewUtils";

type ActiveSyncStatusLike = {
  lastSyncedAtMs?: number | null;
  hasError?: boolean;
  isRetrying?: boolean;
  retry?: (() => void | Promise<void>) | null;
} | null;

type SelectedCardLike = {
  id?: string | null;
  updatedAt?: unknown;
  createdAt?: unknown;
} | null;

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

export const resolveOverlayRight = ({
  isDesktop,
  isMetaOpen,
}: {
  isDesktop: boolean;
  isMetaOpen: boolean;
}) => {
  if (!isDesktop) {
    return "0.75rem";
  }

  return isMetaOpen
    ? "calc(var(--ui-panel-width) + 2.75rem)"
    : "calc(var(--ui-space-1) + 2.75rem)";
};

export const resolveLastSyncedAtMs = ({
  activeSyncStatus,
  selectedCard,
}: {
  activeSyncStatus: ActiveSyncStatusLike;
  selectedCard: SelectedCardLike;
}) => {
  return (
    activeSyncStatus?.lastSyncedAtMs ??
    toTimeMs(selectedCard?.updatedAt) ??
    toTimeMs(selectedCard?.createdAt) ??
    null
  );
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
  previewPaneWidth: (mode: string, value: number) => void;
  persistPaneWidth: (mode: string, value: number) => Promise<void>;
  stepPaneWidth: (delta: number) => void;
  resetActivePaneWidth: () => void;
  activePaneMode: string;
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