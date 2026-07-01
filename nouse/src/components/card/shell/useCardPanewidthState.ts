import { useCallback, useEffect, useRef, useState } from "react";
import type { DependencyList } from "react";
import type { CardPaneMode } from "@/components/card/frame/cardPane.constants";
import { clampPaneWidthPx } from "@/components/card/frame/cardPane.constants";



type PaneWidthMap<T> = {
  view: T;
  edit: T;
};
type KeyedPaneWidthState = {
  key: string;
  width: number;
};
type PaneWidthPreference = {
  key: string;
  width: number;
};
type PaneWidthSyncBehavior = "active-only" | "both";
interface UseCardPaneWidthStateOptions {
  isEditMode: boolean;
  preferredWidths: PaneWidthMap<PaneWidthPreference>;
  defaultWidths: PaneWidthMap<number>;
  minWidths: PaneWidthMap<number>;
  measureViewportWidth?: (element: HTMLDivElement) => number;
  viewportObserverDeps?: DependencyList;
  initialViewportWidth?: number;
  reservedViewportInsetPx?: number;
  allowStoredWidthBeyondViewport?: boolean;
  previewBehavior?: PaneWidthSyncBehavior;
  persistBehavior?: PaneWidthSyncBehavior;
  onPersist?: (mode: CardPaneMode, widthPx: number) => void;
}



const DEFAULT_INITIAL_VIEWPORT_WIDTH_PX = 1024;



const defaultMeasureViewportWidth = (element: HTMLDivElement) =>
  Math.max(0, Math.round(element.clientWidth));
const getActiveMode = (isEditMode: boolean): CardPaneMode =>
  isEditMode ? "edit" : "view";
const useCardPaneWidthState = ({ isEditMode, preferredWidths, defaultWidths, minWidths, measureViewportWidth = defaultMeasureViewportWidth, viewportObserverDeps = [], initialViewportWidth = DEFAULT_INITIAL_VIEWPORT_WIDTH_PX, reservedViewportInsetPx = 0, allowStoredWidthBeyondViewport = false, previewBehavior = "active-only", persistBehavior = "active-only", onPersist }: UseCardPaneWidthStateOptions) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);

  const [contentViewportWidth, setContentViewportWidth] = useState<number>(
    () =>
      typeof window === "undefined" ? initialViewportWidth : window.innerWidth,
  );

  const [viewPaneState, setViewPaneState] = useState<KeyedPaneWidthState>(
    () => ({
      key: preferredWidths.view.key,
      width: preferredWidths.view.width,
    }),
  );

  const [editPaneState, setEditPaneState] = useState<KeyedPaneWidthState>(
    () => ({
      key: preferredWidths.edit.key,
      width: preferredWidths.edit.width,
    }),
  );

  const viewPaneWidthPx =
    viewPaneState.key === preferredWidths.view.key
      ? viewPaneState.width
      : preferredWidths.view.width;

  const editPaneWidthPx =
    editPaneState.key === preferredWidths.edit.key
      ? editPaneState.width
      : preferredWidths.edit.width;

  const viewportDepsKey = JSON.stringify(viewportObserverDeps);

  useEffect(() => {
    const element = contentViewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const nextWidth = measureViewportWidth(element);

      setContentViewportWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [measureViewportWidth, viewportDepsKey]);

  const activePaneMode = getActiveMode(isEditMode);
  const activePaneMinWidthPx = minWidths[activePaneMode];
  const activePaneDefaultWidthPx = defaultWidths[activePaneMode];
  const activePaneStoredWidthPx =
    activePaneMode === "edit" ? editPaneWidthPx : viewPaneWidthPx;

  const availableViewportWidthPx =
    contentViewportWidth > 0
      ? Math.max(
        activePaneMinWidthPx,
        contentViewportWidth - reservedViewportInsetPx,
      )
      : 0;

  const activePaneMaxWidthPx =
    availableViewportWidthPx > 0
      ? allowStoredWidthBeyondViewport
        ? Math.max(
          activePaneMinWidthPx,
          availableViewportWidthPx,
          activePaneStoredWidthPx,
          activePaneDefaultWidthPx,
        )
        : Math.max(activePaneMinWidthPx, availableViewportWidthPx)
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
    availableViewportWidthPx > 0
      ? Math.max(1, Math.min(activePaneWidthPx, availableViewportWidthPx))
      : activePaneWidthPx;

  const applyPaneWidthPreview = useCallback(
    (mode: CardPaneMode, widthPx: number) => {
      if (previewBehavior === "both") {
        const sharedMinWidthPx = Math.max(minWidths.view, minWidths.edit);
        const nextWidth = clampPaneWidthPx(widthPx, sharedMinWidthPx);

        setViewPaneState({
          key: preferredWidths.view.key,
          width: nextWidth,
        });
        setEditPaneState({
          key: preferredWidths.edit.key,
          width: nextWidth,
        });
        return;
      }

      const nextWidth = clampPaneWidthPx(widthPx, minWidths[mode]);

      if (mode === "edit") {
        setEditPaneState({
          key: preferredWidths.edit.key,
          width: nextWidth,
        });
        return;
      }

      setViewPaneState({
        key: preferredWidths.view.key,
        width: nextWidth,
      });
    },
    [
      minWidths,
      preferredWidths.edit.key,
      preferredWidths.view.key,
      previewBehavior,
    ],
  );

  const previewPaneWidth = useCallback(
    (mode: CardPaneMode, widthPx: number) => {
      applyPaneWidthPreview(mode, widthPx);
    },
    [applyPaneWidthPreview],
  );

  const persistPaneWidth = useCallback(
    (mode: CardPaneMode, widthPx: number) => {
      if (persistBehavior === "both") {
        const sharedMinWidthPx = Math.max(minWidths.view, minWidths.edit);
        const nextWidth = clampPaneWidthPx(widthPx, sharedMinWidthPx);

        setViewPaneState({
          key: preferredWidths.view.key,
          width: nextWidth,
        });
        setEditPaneState({
          key: preferredWidths.edit.key,
          width: nextWidth,
        });

        onPersist?.("view", nextWidth);
        onPersist?.("edit", nextWidth);
        return;
      }

      const nextWidth = clampPaneWidthPx(widthPx, minWidths[mode]);

      if (mode === "edit") {
        setEditPaneState({
          key: preferredWidths.edit.key,
          width: nextWidth,
        });
      } else {
        setViewPaneState({
          key: preferredWidths.view.key,
          width: nextWidth,
        });
      }

      onPersist?.(mode, nextWidth);
    },
    [
      minWidths,
      onPersist,
      persistBehavior,
      preferredWidths.edit.key,
      preferredWidths.view.key,
    ],
  );

  const stepPaneWidth = useCallback(
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

  const resetActivePaneWidth = useCallback(() => {
    void persistPaneWidth(activePaneMode, activePaneDefaultWidthPx);
  }, [activePaneDefaultWidthPx, activePaneMode, persistPaneWidth]);

  return {
    contentViewportRef,
    contentViewportWidth,
    viewPaneWidthPx,
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
};



export { useCardPaneWidthState };
