import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type KeyedPaneWidthState = {
  key: string;
  width: number;
};

function getReservedScrollbarGutterWidthPx(): number {
  if (typeof document === "undefined") return 0;

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.top = "-9999px";
  probe.style.width = "100px";
  probe.style.height = "100px";
  probe.style.overflow = "scroll";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);

  const width = Math.max(0, probe.offsetWidth - probe.clientWidth);
  document.body.removeChild(probe);
  return width;
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
  const reservedScrollbarGutterWidthPx = useMemo(
    () => (isDesktop ? getReservedScrollbarGutterWidthPx() : 0),
    [isDesktop],
  );

  const viewPreferenceKey = `${cardSetId ?? ""}:${settings?.cardViewPaneWidthPx ?? ""}`;
  const editPreferenceKey = `${cardSetId ?? ""}:${settings?.cardEditPaneWidthPx ?? ""}`;

  const preferredViewPaneWidthPx = useMemo(() => {
    const localStored =
      cardSetId ? getCardSetWidthPreference(cardSetId, "view") : undefined;

    return clampPaneWidthPx(
      localStored ??
        settings?.cardViewPaneWidthPx ??
        CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
      CARD_PANE_VIEW_MIN_WIDTH_PX,
    );
  }, [cardSetId, settings?.cardViewPaneWidthPx]);

  const preferredEditPaneWidthPx = useMemo(() => {
    const localStored =
      cardSetId ? getCardSetWidthPreference(cardSetId, "edit") : undefined;

    return clampPaneWidthPx(
      localStored ??
        settings?.cardEditPaneWidthPx ??
        CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
      CARD_PANE_EDIT_MIN_WIDTH_PX,
    );
  }, [cardSetId, settings?.cardEditPaneWidthPx]);

  const [viewPaneState, setViewPaneState] = useState<KeyedPaneWidthState>(() => ({
    key: viewPreferenceKey,
    width: preferredViewPaneWidthPx,
  }));

  const [editPaneState, setEditPaneState] = useState<KeyedPaneWidthState>(() => ({
    key: editPreferenceKey,
    width: preferredEditPaneWidthPx,
  }));

  const viewPaneWidthPx =
    viewPaneState.key === viewPreferenceKey
      ? viewPaneState.width
      : preferredViewPaneWidthPx;

  const editPaneWidthPx =
    editPaneState.key === editPreferenceKey
      ? editPaneState.width
      : preferredEditPaneWidthPx;

  useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const next = Math.max(
        0,
        Math.round(element.clientWidth),
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

  const activePaneStoredWidthPx = isGlobalEditing
    ? editPaneWidthPx
    : viewPaneWidthPx;
  const availableViewportWidthPx =
    contentViewportWidth > 0
      ? Math.max(
          activePaneMinWidthPx,
          contentViewportWidth - reservedScrollbarGutterWidthPx,
        )
      : 0;

  const activePaneMaxWidthPx =
    availableViewportWidthPx > 0
      ? Math.max(activePaneMinWidthPx, availableViewportWidthPx)
      : Math.max(activePaneMinWidthPx, activePaneDefaultWidthPx);

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
    availableViewportWidthPx > 0
      ? Math.max(1, Math.min(activePaneWidthPx, availableViewportWidthPx))
      : activePaneWidthPx;

  const persistPaneWidth = useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;

      const next = clampPaneWidthPx(widthPx, minWidth);

      if (mode === "edit") {
        setEditPaneState({
          key: editPreferenceKey,
          width: next,
        });
      } else {
        setViewPaneState({
          key: viewPreferenceKey,
          width: next,
        });
      }

      if (cardSetId) {
        setCardSetWidthPreference(cardSetId, mode, next);
      }
    },
    [cardSetId, editPreferenceKey, viewPreferenceKey],
  );

  const previewPaneWidth = useCallback(
    (mode: "view" | "edit", widthPx: number) => {
      const minWidth =
        mode === "edit"
          ? CARD_PANE_EDIT_MIN_WIDTH_PX
          : CARD_PANE_VIEW_MIN_WIDTH_PX;

      const next = clampPaneWidthPx(widthPx, minWidth);

      if (mode === "edit") {
        setEditPaneState({
          key: editPreferenceKey,
          width: next,
        });
      } else {
        setViewPaneState({
          key: viewPreferenceKey,
          width: next,
        });
      }
    },
    [editPreferenceKey, viewPreferenceKey],
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
    contentViewportWidth,
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
