import React from "react";

import { clampPaneWidthPx } from "@/components/folder/panes/CardPaneWidthControl";
import type { UserSettings } from "@/types";

const CARD_PANE_VIEW_DEFAULT_WIDTH_PX = 576;
const CARD_PANE_EDIT_DEFAULT_WIDTH_PX = 820;
const CARD_PANE_DOCKED_EDIT_DEFAULT_WIDTH_PX = 1000;
const CARD_PANE_VIEW_MIN_WIDTH_PX = 360;
const CARD_PANE_EDIT_MIN_WIDTH_PX = 640;
const CARD_PANE_AUTO_MAX_SCALE = 4;
const CARD_EDITOR_PAIR_GAP_PX = 16;

export const CARD_PANE_WIDTH_STEP_PX = 40;
export const CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX = 72;

interface UseCardEditorPaneWidthParams {
  settings?: Partial<UserSettings> | null;
  updateSettings: (patch: Partial<UserSettings>) => Promise<unknown>;
  dockToolbarsToTop: boolean;
  embeddedInPager: boolean;
  hideBlockToolbars: boolean;
  forcedPaneWidthPx: number | null;
  usesExternalToolbarMount: boolean;
  highlightActiveCards: boolean;
  isEditing: boolean;
  isMetaOpen: boolean;
  normalizedSelectedCardId: string | null;
  selectedCardId?: string;
  canonicalCardWidth: number;
}

export function useCardEditorPaneWidth({
  settings,
  updateSettings,
  dockToolbarsToTop,
  embeddedInPager,
  hideBlockToolbars,
  forcedPaneWidthPx,
  usesExternalToolbarMount,
  highlightActiveCards,
  isEditing,
  isMetaOpen,
  normalizedSelectedCardId,
  selectedCardId,
  canonicalCardWidth,
}: UseCardEditorPaneWidthParams) {
  const contentViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [contentViewportWidth, setContentViewportWidth] = React.useState<number>(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth),
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
    setViewPaneWidthPx(
      clampPaneWidthPx(
        settings?.cardViewPaneWidthPx ?? CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
        CARD_PANE_VIEW_MIN_WIDTH_PX,
      ),
    );
  }, [settings?.cardViewPaneWidthPx]);

  React.useEffect(() => {
    setEditPaneWidthPx(
      clampPaneWidthPx(
        settings?.cardEditPaneWidthPx ?? defaultEditPaneWidthPx,
        CARD_PANE_EDIT_MIN_WIDTH_PX,
      ),
    );
  }, [defaultEditPaneWidthPx, settings?.cardEditPaneWidthPx]);

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
      ? Math.max(activePaneMinWidthPx, contentViewportWidth)
      : activeStoredPaneWidthPx;
  const activePaneWidthPx = clampPaneWidthPx(
    activeStoredPaneWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const resolvedPaneWidthPx =
    typeof forcedPaneWidthPx === "number" && Number.isFinite(forcedPaneWidthPx)
      ? clampPaneWidthPx(forcedPaneWidthPx, activePaneMinWidthPx)
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
    dockToolbarsToTop &&
    !hideBlockToolbars &&
    !usesExternalToolbarMount;
  const shouldShowInlineToolbarMount =
    !dockToolbarsToTop &&
    !hideBlockToolbars &&
    !usesExternalToolbarMount;
  const shouldShowEditingBadge = !embeddedInPager || highlightActiveCards;

  const shouldApplyPaneWidth =
    (showWidthControl && contentViewportWidth > 0) || forcedPaneWidthPx != null;
  const effectivePaneWidthPx = shouldApplyPaneWidth
    ? Math.max(
        activePaneMinWidthPx,
        Math.min(
          resolvedPaneWidthPx,
          contentViewportWidth > 0 ? contentViewportWidth : resolvedPaneWidthPx,
        ),
      )
    : Math.max(activePaneMinWidthPx, contentViewportWidth || activePaneMinWidthPx);

  const useTwoColumnEditorLayout = effectivePaneWidthPx >= 768;
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
    async (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const nextWidth = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(nextWidth);
        await updateSettings({ cardEditPaneWidthPx: nextWidth });
        return;
      }
      setViewPaneWidthPx(nextWidth);
      await updateSettings({ cardViewPaneWidthPx: nextWidth });
    },
    [updateSettings],
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
    editorCardFixedScale,
    activePaneWidthStyle,
    persistPaneWidth,
    previewPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  };
}
