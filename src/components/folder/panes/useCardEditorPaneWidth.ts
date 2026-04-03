import React from "react";

import type { UserSettings } from "@/types";
import {
  getCardSetWidthPreference,
  setCardSetWidthPreference,
} from "@/services/cardWidthPreferences";

const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 820;
const CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_EDITOR_PAIR_GAP_PX = 16;
const CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX = CARD_PANE_EDIT_MIN_WIDTH_PX;

export const CARD_PANE_WIDTH_STEP_PX = 40;
export const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;

function clampPaneWidthPx(
  value: number | null | undefined,
  min: number,
  max?: number,
): number {
  const fallback = Math.max(1, min);
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clampedMin = Math.max(1, min);
  const clampedMax =
    typeof max === "number" && Number.isFinite(max)
      ? Math.max(clampedMin, max)
      : Number.POSITIVE_INFINITY;
  return Math.min(clampedMax, Math.max(clampedMin, Math.round(safeValue)));
}

interface UseCardEditorPaneWidthParams {
  /** Read-only fallback. Width is persisted to localStorage only (device-local). */
  settings?: Partial<UserSettings> | null;
  dockToolbarsToTop: boolean;
  embeddedInPager: boolean;
  hideBlockToolbars: boolean;
  forcedPaneWidthPx: number | null;
  usesExternalToolbarMount: boolean;
  isPagerActiveCard: boolean;
  isEditing: boolean;
  isMetaOpen: boolean;
  normalizedSelectedCardId: string | null;
  selectedCardId?: string;
  canonicalCardWidth: number;
  cardSetId?: string | null;
}

export function useCardEditorPaneWidth({
  settings,
  dockToolbarsToTop,
  embeddedInPager,
  hideBlockToolbars,
  forcedPaneWidthPx,
  usesExternalToolbarMount,
  isPagerActiveCard,
  isEditing,
  isMetaOpen,
  normalizedSelectedCardId,
  selectedCardId,
  canonicalCardWidth,
  cardSetId,
}: UseCardEditorPaneWidthParams) {
  const contentViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [contentViewportWidth, setContentViewportWidth] =
    React.useState<number>(() =>
      typeof window === "undefined" ? 1024 : window.innerWidth,
    );
  const [viewPaneWidthPx, setViewPaneWidthPx] = React.useState<number>(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [editPaneWidthPx, setEditPaneWidthPx] = React.useState<number>(
    dockToolbarsToTop
      ? CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX
      : CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  );

  const defaultEditPaneWidthPx = dockToolbarsToTop
    ? CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX
    : CARD_PANE_EDIT_DEFAULT_WIDTH_PX;

  React.useEffect(() => {
    const localStored = cardSetId
      ? getCardSetWidthPreference(cardSetId, "view")
      : undefined;
    setViewPaneWidthPx(
      clampPaneWidthPx(
        localStored ??
          settings?.cardViewPaneWidthPx ??
          CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
        CARD_PANE_VIEW_MIN_WIDTH_PX,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSetId, settings?.cardViewPaneWidthPx]);

  React.useEffect(() => {
    const localStored = cardSetId
      ? getCardSetWidthPreference(cardSetId, "edit")
      : undefined;
    setEditPaneWidthPx(
      clampPaneWidthPx(
        localStored ?? settings?.cardEditPaneWidthPx ?? defaultEditPaneWidthPx,
        CARD_PANE_EDIT_MIN_WIDTH_PX,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSetId, defaultEditPaneWidthPx, settings?.cardEditPaneWidthPx]);

  React.useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const nextWidth = Math.max(
        0,
        Math.round(
          Math.max(
            element.clientWidth,
            element.parentElement?.clientWidth ?? 0,
          ),
        ),
      );
      setContentViewportWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    embeddedInPager,
    isEditing,
    isMetaOpen,
    normalizedSelectedCardId,
    selectedCardId,
  ]);

  const showWidthControl = !embeddedInPager;
  const activePaneMode = isEditing ? "edit" : "view";
  const activePaneMinWidthPx = isEditing
    ? CARD_PANE_EDIT_MIN_WIDTH_PX
    : CARD_PANE_VIEW_MIN_WIDTH_PX;
  const activePaneDefaultWidthPx = isEditing
    ? defaultEditPaneWidthPx
    : CARD_PANE_VIEW_DEFAULT_WIDTH_PX;
  const activeStoredPaneWidthPx = isEditing ? editPaneWidthPx : viewPaneWidthPx;
  const activePaneMaxWidthPx =
    contentViewportWidth > 0
      ? Math.max(
          activePaneMinWidthPx,
          contentViewportWidth,
          activeStoredPaneWidthPx,
          activePaneDefaultWidthPx,
        )
      : Math.max(
          activePaneMinWidthPx,
          activeStoredPaneWidthPx,
          activePaneDefaultWidthPx,
        );
  const activePaneWidthPx = clampPaneWidthPx(
    activeStoredPaneWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const hasForcedPaneWidth =
    typeof forcedPaneWidthPx === "number" && Number.isFinite(forcedPaneWidthPx);
  const shouldUseEdgeToEdgePaneWidth = isMetaOpen && !embeddedInPager;
  const resolvedPaneWidthPx = hasForcedPaneWidth
    ? clampPaneWidthPx(forcedPaneWidthPx, activePaneMinWidthPx)
    : shouldUseEdgeToEdgePaneWidth
      ? activePaneMaxWidthPx
      : activePaneWidthPx;
  const activePaneDisplayedDefaultWidthPx = clampPaneWidthPx(
    activePaneDefaultWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );

  const shouldReserveWidthControlSpace =
    showWidthControl && dockToolbarsToTop && !usesExternalToolbarMount;
  const hideCardShellHeader = embeddedInPager && dockToolbarsToTop;
  const shouldDockToolbarToCardTop =
    dockToolbarsToTop && !hideBlockToolbars && !usesExternalToolbarMount;
  const shouldShowInlineToolbarMount =
    !dockToolbarsToTop && !hideBlockToolbars && !usesExternalToolbarMount;
  const shouldShowEditingBadge = !embeddedInPager || isPagerActiveCard;

  const shouldApplyPaneWidth =
    (showWidthControl && contentViewportWidth > 0) || forcedPaneWidthPx != null;
  const availablePaneWidthPx =
    contentViewportWidth > 0 ? contentViewportWidth : resolvedPaneWidthPx;
  const effectivePaneWidthPx = hasForcedPaneWidth
    ? resolvedPaneWidthPx
    : shouldApplyPaneWidth
      ? Math.max(1, Math.min(resolvedPaneWidthPx, availablePaneWidthPx))
      : Math.max(1, availablePaneWidthPx || activePaneMinWidthPx);

  const useTwoColumnEditorLayout =
    (embeddedInPager && isEditing) ||
    effectivePaneWidthPx >= CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX;
  const editorCardTargetWidthPx = useTwoColumnEditorLayout
    ? Math.max(1, (effectivePaneWidthPx - CARD_EDITOR_PAIR_GAP_PX) / 2)
    : Math.max(1, effectivePaneWidthPx);
  const editorCardFixedScale = Math.max(
    0.1,
    Math.min(
      CARD_PANE_AUTO_MAX_SCALE,
      editorCardTargetWidthPx / Math.max(1, canonicalCardWidth),
    ),
  );

  const activePaneWidthStyle = shouldApplyPaneWidth
    ? {
        width: `${resolvedPaneWidthPx}px`,
        maxWidth: "100%",
      }
    : undefined;

  const persistPaneWidth = React.useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const nextWidth = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(nextWidth);
      } else {
        setViewPaneWidthPx(nextWidth);
      }
      if (cardSetId) setCardSetWidthPreference(cardSetId, mode, nextWidth);
    },
    [cardSetId],
  );

  const previewPaneWidth = React.useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const nextWidth = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(nextWidth);
        return;
      }
      setViewPaneWidthPx(nextWidth);
    },
    [],
  );

  const stepPaneWidth = React.useCallback(
    (deltaPx: number) => {
      const nextWidth = clampPaneWidthPx(
        activePaneWidthPx + deltaPx,
        activePaneMinWidthPx,
        activePaneMaxWidthPx,
      );
      void persistPaneWidth(activePaneMode, nextWidth);
    },
    [
      activePaneMaxWidthPx,
      activePaneMinWidthPx,
      activePaneMode,
      activePaneWidthPx,
      persistPaneWidth,
    ],
  );

  const resetActivePaneWidth = React.useCallback(() => {
    void persistPaneWidth(activePaneMode, activePaneDefaultWidthPx);
  }, [activePaneDefaultWidthPx, activePaneMode, persistPaneWidth]);

  return {
    contentViewportRef,
    showWidthControl,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneDisplayedDefaultWidthPx,
    shouldReserveWidthControlSpace,
    hideCardShellHeader,
    shouldDockToolbarToCardTop,
    shouldShowInlineToolbarMount,
    shouldShowEditingBadge,
    useTwoColumnEditorLayout,
    editorCardFixedScale,
    activePaneWidthStyle,
    persistPaneWidth,
    previewPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  };
}
