import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSettings } from "@/types";
import {
  clampPaneWidthPx,
  CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  CARD_PANE_EDIT_MIN_WIDTH_PX,
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_PANE_VIEW_MIN_WIDTH_PX,
} from "@/pages/card-view/constants";
import {
  getCardSetWidthPreference,
  setCardSetWidthPreference,
} from "@/services/cardWidthPreferences";

interface UseCardViewPaneWidthOptions {
  isGlobalEditing: boolean;
  isDesktop: boolean;
  isMetaOpen: boolean;
  currentIndex: number;
  /** Read-only fallback. Width is persisted to localStorage only (device-local). */
  settings: UserSettings | undefined;
  cardSetId?: string | null;
}

export function useCardViewPaneWidth({
  isGlobalEditing,
  isDesktop,
  isMetaOpen,
  currentIndex,
  settings,
  cardSetId,
}: UseCardViewPaneWidthOptions) {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const [contentViewportWidth, setContentViewportWidth] = useState<number>(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth),
  );
  const [viewPaneWidthPx, setViewPaneWidthPx] = useState(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [editPaneWidthPx, setEditPaneWidthPx] = useState(
    CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  );

  // Restore from localStorage (per-cardSet, device-local) first;
  // fall back to global UserSettings, then to hardcoded default.
  useEffect(() => {
    const localStored =
      cardSetId ? getCardSetWidthPreference(cardSetId, "view") : undefined;
    setViewPaneWidthPx(
      clampPaneWidthPx(
        localStored ??
          settings?.cardViewPaneWidthPx ??
          CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
        CARD_PANE_VIEW_MIN_WIDTH_PX,
      ),
    );
  }, [cardSetId, settings?.cardViewPaneWidthPx]);

  useEffect(() => {
    const localStored =
      cardSetId ? getCardSetWidthPreference(cardSetId, "edit") : undefined;
    setEditPaneWidthPx(
      clampPaneWidthPx(
        localStored ??
          settings?.cardEditPaneWidthPx ??
          CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
        CARD_PANE_EDIT_MIN_WIDTH_PX,
      ),
    );
  }, [cardSetId, settings?.cardEditPaneWidthPx]);

  useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const updateWidth = () => {
      const next = Math.max(
        0,
        Math.round(
          Math.max(
            element.clientWidth,
            element.parentElement?.clientWidth ?? 0,
          ),
        ),
      );
      setContentViewportWidth((prev) => (prev === next ? prev : next));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isDesktop, isGlobalEditing, isMetaOpen, currentIndex]);

  const activePaneMode = isGlobalEditing ? "edit" : "view";
  const activePaneMinWidthPx = isGlobalEditing
    ? CARD_PANE_EDIT_MIN_WIDTH_PX
    : CARD_PANE_VIEW_MIN_WIDTH_PX;
  const activePaneDefaultWidthPx = isGlobalEditing
    ? CARD_PANE_EDIT_DEFAULT_WIDTH_PX
    : CARD_PANE_VIEW_DEFAULT_WIDTH_PX;
  const activePaneStoredWidthPx = isGlobalEditing ? editPaneWidthPx : viewPaneWidthPx;
  const activePaneMaxWidthPx =
    contentViewportWidth > 0
      ? Math.max(
          activePaneMinWidthPx,
          contentViewportWidth,
          activePaneStoredWidthPx,
          activePaneDefaultWidthPx,
        )
      : Math.max(
          activePaneMinWidthPx,
          activePaneStoredWidthPx,
          activePaneDefaultWidthPx,
        );
  const activePaneWidthPx = clampPaneWidthPx(
    activePaneStoredWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const activePaneDisplayedDefaultWidthPx = clampPaneWidthPx(
    activePaneDefaultWidthPx,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
  );
  const activePaneRenderWidthPx =
    contentViewportWidth > 0
      ? Math.max(1, Math.min(activePaneWidthPx, contentViewportWidth))
      : activePaneWidthPx;

  const persistPaneWidth = useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit" ? CARD_PANE_EDIT_MIN_WIDTH_PX : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const next = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") {
        setEditPaneWidthPx(next);
      } else {
        setViewPaneWidthPx(next);
      }
      if (cardSetId) setCardSetWidthPreference(cardSetId, mode, next);
    },
    [cardSetId],
  );

  const previewPaneWidth = useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit" ? CARD_PANE_EDIT_MIN_WIDTH_PX : CARD_PANE_VIEW_MIN_WIDTH_PX;
      const next = clampPaneWidthPx(widthPx, minWidth);
      if (mode === "edit") setEditPaneWidthPx(next);
      else setViewPaneWidthPx(next);
    },
    [],
  );

  const stepPaneWidth = useCallback(
    (deltaPx: number) => {
      const next = clampPaneWidthPx(
        activePaneWidthPx + deltaPx,
        activePaneMinWidthPx,
        activePaneMaxWidthPx,
      );
      void persistPaneWidth(activePaneMode, next);
    },
    [
      activePaneMaxWidthPx,
      activePaneMinWidthPx,
      activePaneMode,
      activePaneWidthPx,
      persistPaneWidth,
    ],
  );

  const resetActivePaneWidth = useCallback(() => {
    void persistPaneWidth(activePaneMode, activePaneDefaultWidthPx);
  }, [activePaneDefaultWidthPx, activePaneMode, persistPaneWidth]);

  return {
    contentViewportRef,
    editPaneWidthPx,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneRenderWidthPx,
    activePaneDisplayedDefaultWidthPx,
    previewPaneWidth,
    persistPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  };
}
