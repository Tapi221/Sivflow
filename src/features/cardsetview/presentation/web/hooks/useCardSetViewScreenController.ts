import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CARD_PANE_WIDTH_STEP_PX, CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT, CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT, CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT } from "@constants/shared/flashcard";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
import { CARD_LAYOUT_MODE_LABELS, type CardLayoutMode, type CardSetInteractionMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { clampCardIndex } from "@/features/cardsetview/domain/cardSetViewState";
import { useCardSetViewBreadcrumbs } from "@/features/cardsetview/presentation/web/infra/useCardSetViewBreadcrumbs";
import { useCardSetViewParams } from "@/features/cardsetview/presentation/web/infra/useCardSetViewParams";
import { buildWidthControl } from "@/features/cardsetview/presentation/web/ui/cardSetViewViewModels";
import { useSetBreadcrumbCrumbs } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { resolveSplitFallbackLayoutModePreference } from "@/services/cardLayoutFallbackPreferences";
import { useCardSetViewData } from "./useCardSetViewData";
import { useCardSetViewPaneWidth } from "./useCardSetViewPaneWidth";
import { useCardSetViewState } from "./useCardSetViewState";
import { useCardSetViewWindowEvents } from "./useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "./useCardSetViewZoom";
import { useCardSetViewZoomInput } from "./useCardSetViewZoomInput";

type ScrollAnchorFace = "question" | "answer";

type CardSetViewScrollSnapshot = {
  scrollTop: number;
};

type UseCardSetViewScreenControllerParams = {
  cardSetId?: string | null;
};

const CARD_SET_VIEW_SCROLL_RESTORE_STABILIZATION_MS = 320;
const SCROLLABLE_OVERFLOW_Y_VALUES = new Set(["auto", "scroll", "overlay"]);

const resolveNowMs = () => typeof performance !== "undefined" ? performance.now() : Date.now();

const isElementScrollableY = (element: HTMLElement) => {
  if (typeof window === "undefined") return false;

  const overflowY = window.getComputedStyle(element).overflowY;
  if (!SCROLLABLE_OVERFLOW_Y_VALUES.has(overflowY)) return false;

  return element.scrollHeight > element.clientHeight;
};

const resolvePrimaryScrollableElement = (viewport: HTMLDivElement | null) => {
  if (!viewport) return null;

  if (isElementScrollableY(viewport)) return viewport;

  const descendants = viewport.querySelectorAll<HTMLElement>("*");
  for (const descendant of descendants) {
    if (isElementScrollableY(descendant)) return descendant;
  }

  return null;
};

const clampElementScrollTop = (scrollTop: number, element: HTMLElement) => {
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
  const safeScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;

  return Math.min(Math.max(0, safeScrollTop), maxScrollTop);
};

export const useCardSetViewScreenController = (params: UseCardSetViewScreenControllerParams = {}) => {
  const setExtraCrumbs = useSetBreadcrumbCrumbs();
  const { error: toastError } = useToast();
  const presentationTarget = usePresentationTarget();
  const isDesktop = presentationTarget === "desktop";
  const { settings } = useUserSettings();
  const routeParams = useCardSetViewParams();
  const cardSetId = params.cardSetId ?? routeParams.cardSetId;
  const initialIndex = routeParams.initialIndex;
  const targetCardId = routeParams.targetCardId;

  const data = useCardSetViewData({ cardSetId });

  const state = useCardSetViewState({
    initialIndex,
    targetCardId,
    cardSetId,
    cardSetById: data.cardSetById,
    sortedCards: data.sortedCards,
    cardIndexById: data.cardIndexById,
    createCard: data.createCard,
    updateCard: data.updateCard,
    selectedCardSet: data.selectedCardSet,
    toastError,
    deviceScope: presentationTarget,
  });

  const paneWidth = useCardSetViewPaneWidth({ isGlobalEditing: state.isGlobalEditing, isDesktop, settings, cardSetId });

  const [activeScrollAnchorFace, setActiveScrollAnchorFace] = useState<ScrollAnchorFace | null>(null);
  const [layoutTransitionScrollAnchorRevision, setLayoutTransitionScrollAnchorRevision] = useState(0);
  const [scrollToActiveIndexRequestKey, setScrollToActiveIndexRequestKey] = useState(0);
  const interactionModeScrollSnapshotRef = useRef<CardSetViewScrollSnapshot | null>(null);
  const scrollRestoreAnimationFrameRef = useRef<number | null>(null);

  const layoutInteractionMode: CardSetInteractionMode = state.isGlobalEditing ? "edit" : "view";

  const splitFallbackLayoutMode = useMemo(() => resolveSplitFallbackLayoutModePreference(presentationTarget), [presentationTarget]);

  const zoom = useCardSetViewZoom({
    deviceScope: presentationTarget,
    cardSetId,
    viewportRef: paneWidth.contentViewportRef,
    displayMode: state.currentDisplayMode,
    interactionMode: layoutInteractionMode,
    requestedCardLayoutMode: state.currentCardLayoutMode,
    splitFallbackLayoutMode,
  });

  useCardSetViewZoomInput({
    containerRef: paneWidth.contentViewportRef,
    enabled: isDesktop,
    zoomPercent: zoom.zoomPercent,
    minZoomPercent: zoom.minZoomPercent,
    maxZoomPercent: zoom.maxZoomPercent,
    presentationWidthPx: zoom.presentationWidthPx,
    maxPresentationWidthPx: zoom.maxPresentationWidthPx,
    cardLayoutMode: zoom.effectiveCardLayoutMode,
    wheelZoomStepPercent: CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT,
    gestureZoomStepPercent: CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT,
    onZoomPercentChange: zoom.setZoomPercent,
  });

  useCardSetViewBreadcrumbs({ selectedCardSet: data.selectedCardSet, selectedCard: state.selectedCard, sortedCards: data.sortedCards, folders: data.folders, setExtraCrumbs });

  const captureInteractionModeScrollSnapshot = useCallback(() => {
    const scrollElement = resolvePrimaryScrollableElement(paneWidth.contentViewportRef.current);

    if (!scrollElement) {
      interactionModeScrollSnapshotRef.current = null;
      return;
    }

    interactionModeScrollSnapshotRef.current = {
      scrollTop: scrollElement.scrollTop,
    };
  }, [paneWidth.contentViewportRef]);

  const restoreInteractionModeScrollSnapshot = useCallback(() => {
    const snapshot = interactionModeScrollSnapshotRef.current;
    const scrollElement = resolvePrimaryScrollableElement(paneWidth.contentViewportRef.current);

    if (!snapshot || !scrollElement) return;

    scrollElement.scrollTop = clampElementScrollTop(snapshot.scrollTop, scrollElement);
  }, [paneWidth.contentViewportRef]);

  const handleToggleViewMode = useCallback(() => {
    captureInteractionModeScrollSnapshot();
    state.handleToggleViewMode();
  }, [captureInteractionModeScrollSnapshot, state.handleToggleViewMode]);

  useLayoutEffect(() => {
    if (!interactionModeScrollSnapshotRef.current) return;

    restoreInteractionModeScrollSnapshot();

    if (typeof window === "undefined") {
      interactionModeScrollSnapshotRef.current = null;
      return;
    }

    const startedAt = resolveNowMs();

    const stabilizeScrollPosition = () => {
      if (!interactionModeScrollSnapshotRef.current) {
        scrollRestoreAnimationFrameRef.current = null;
        return;
      }

      restoreInteractionModeScrollSnapshot();

      if (resolveNowMs() - startedAt >= CARD_SET_VIEW_SCROLL_RESTORE_STABILIZATION_MS) {
        interactionModeScrollSnapshotRef.current = null;
        scrollRestoreAnimationFrameRef.current = null;
        return;
      }

      scrollRestoreAnimationFrameRef.current = window.requestAnimationFrame(stabilizeScrollPosition);
    };

    scrollRestoreAnimationFrameRef.current = window.requestAnimationFrame(stabilizeScrollPosition);

    return () => {
      if (scrollRestoreAnimationFrameRef.current == null) return;

      window.cancelAnimationFrame(scrollRestoreAnimationFrameRef.current);
      scrollRestoreAnimationFrameRef.current = null;
    };
  }, [restoreInteractionModeScrollSnapshot, state.isGlobalEditing]);

  useCardSetViewWindowEvents({ handleToggleViewMode, createAndFocusCard: state.createAndFocusCard });

  const widthControl = buildWidthControl({
    isDesktop,
    isGlobalEditing: state.isGlobalEditing,
    activePaneWidthPx: paneWidth.activePaneWidthPx,
    activePaneMinWidthPx: paneWidth.activePaneMinWidthPx,
    activePaneMaxWidthPx: paneWidth.activePaneMaxWidthPx,
    activePaneDisplayedDefaultWidthPx: paneWidth.activePaneDisplayedDefaultWidthPx,
    previewPaneWidth: paneWidth.previewPaneWidth,
    persistPaneWidth: paneWidth.persistPaneWidth,
    stepPaneWidth: paneWidth.stepPaneWidth,
    resetActivePaneWidth: paneWidth.resetActivePaneWidth,
    activePaneMode: paneWidth.activePaneMode,
    widthStepPx: CARD_PANE_WIDTH_STEP_PX,
  });

  const topLeftZoomControl = isDesktop
    ? {
      value: zoom.zoomPercent,
      min: zoom.minZoomPercent,
      max: zoom.maxZoomPercent,
      step: CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT,
      onChange: zoom.setZoomPercent,
      onStepDown: zoom.stepDown,
      onStepUp: zoom.stepUp,
    }
    : null;

  const disabledCardLayoutModes = useMemo(() => ({ stack: false, flip: false, split: !zoom.canUseSplit }), [zoom.canUseSplit]);

  const layoutConstraintIndicatorLabel = useMemo(() => {
    if (!zoom.showConstraintIndicator) return null;

    if (state.currentCardLayoutMode === "split" && zoom.effectiveCardLayoutMode !== "split") {
      return `画面制約で${CARD_LAYOUT_MODE_LABELS[zoom.effectiveCardLayoutMode]}表示中`;
    }

    return "画面制約で縮小中";
  }, [state.currentCardLayoutMode, zoom.effectiveCardLayoutMode, zoom.showConstraintIndicator]);

  const { cardsForPager, currentCardLayoutMode, currentDisplayMode, isFlipped, setCurrentCardFace, setCurrentCardLayoutMode, setCurrentIndex } = state;
  const totalCardsForPager = cardsForPager.length;

  const handleSaveCurrentDisplayMode = useCallback(async () => {
    if (!cardSetId) return;

    try {
      await saveDefaultDisplayMode({ cardSetId, currentDisplayMode, updateCardSet: data.updateCardSet });
    } catch (error) {
      console.error("[CardSetView] Failed to save default display mode", error);
      toastError("表示モードの保存に失敗しました");
    }
  }, [cardSetId, currentDisplayMode, data.updateCardSet, toastError]);

  const handleActiveScrollAnchorFaceChange = useCallback((face: ScrollAnchorFace | null) => {
    setActiveScrollAnchorFace(face);
  }, []);

  const handleJumpToCard = useCallback((nextOneBasedIndex: number) => {
    if (totalCardsForPager <= 0) return;

    const nextZeroBasedIndex = clampCardIndex(nextOneBasedIndex - 1, totalCardsForPager);
    setCurrentIndex(nextZeroBasedIndex);
    setScrollToActiveIndexRequestKey((currentKey) => currentKey + 1);
  }, [setCurrentIndex, totalCardsForPager]);

  const handleChangeCardLayoutMode = useCallback((nextMode: CardLayoutMode) => {
    if (nextMode === currentCardLayoutMode) return;

    if (nextMode === "flip" && currentCardLayoutMode !== "flip") {
      setCurrentCardFace(activeScrollAnchorFace ?? (isFlipped ? "answer" : "question"));
      setLayoutTransitionScrollAnchorRevision((prev) => prev + 1);
    }

    setCurrentCardLayoutMode(nextMode);
  }, [activeScrollAnchorFace, currentCardLayoutMode, isFlipped, setCurrentCardFace, setCurrentCardLayoutMode, setLayoutTransitionScrollAnchorRevision]);

  return {
    cardSetId,
    folderId: data.selectedCardSet?.folderId ?? null,
    presentationTarget,
    isDesktop,
    settings,
    data,
    state,
    paneWidth,
    zoom,
    widthControl,
    topLeftZoomControl,
    handleActiveScrollAnchorFaceChange,
    handleJumpToCard,
    handleToggleViewMode,
    handleChangeCardLayoutMode,
    layoutTransitionScrollAnchorRevision,
    scrollToActiveIndexRequestKey,
    handleSaveCurrentDisplayMode,
    effectiveCardLayoutMode: zoom.effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    splitFallbackLayoutMode,
  };
};