import { useCallback, useEffect, useMemo, useState } from "react";
import { CARD_PANE_WIDTH_STEP_PX } from "@/components/card/frame/cardPane.constants";
import { useSetBreadcrumbCrumbs } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
import type { CardLayoutMode, CardSetInteractionMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_LAYOUT_MODE_LABELS } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT, CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT, CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";
import { clampCardIndex } from "@/features/cardsetview/domain/cardSetViewState";
import { useCardSetViewData } from "./useCardSetViewData";
import { useCardSetViewPaneWidth } from "./useCardSetViewPaneWidth";
import { useCardSetViewState } from "./useCardSetViewState";
import { useCardSetViewWindowEvents } from "./useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "./useCardSetViewZoom";
import { useCardSetViewZoomInput } from "./useCardSetViewZoomInput";
import { useCardSetViewBreadcrumbs } from "@/features/cardsetview/presentation/web/infra/useCardSetViewBreadcrumbs";
import { useCardSetViewParams } from "@/features/cardsetview/presentation/web/infra/useCardSetViewParams";
import { buildWidthControl } from "@/features/cardsetview/presentation/web/ui/cardSetViewViewModels";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { resolveSplitFallbackLayoutModePreference } from "@/services/cardLayoutFallbackPreferences";
import { getCardSetViewNavigationPreference, setCardSetViewNavigationPreference } from "@/services/cardSetViewNavigationPreferences";



type ScrollAnchorFace = "question" | "answer";
type UseCardSetViewScreenControllerParams = {
  cardSetId?: string | null;
};



const buildNavigationScopeKey = ({ deviceScope, cardSetId }: { deviceScope: string; cardSetId: string | null; }) => {
  if (!cardSetId) return null;

  return [deviceScope, cardSetId].join("::");
};
const useCardSetViewScreenController = (params: UseCardSetViewScreenControllerParams = {}) => {
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

  const navigationPreference = useMemo(() => getCardSetViewNavigationPreference({ deviceScope: presentationTarget, cardSetId }), [cardSetId, presentationTarget]);
  const navigationPreferenceCardId = navigationPreference?.cardId;
  const navigationScrollTop = navigationPreference?.scrollTop ?? 0;

  const restoredInitialIndex = useMemo(() => {
    if (targetCardId || !navigationPreferenceCardId) return initialIndex;

    return data.cardIndexById.get(navigationPreferenceCardId) ?? initialIndex;
  }, [data.cardIndexById, initialIndex, navigationPreferenceCardId, targetCardId]);

  const state = useCardSetViewState({
    initialIndex: restoredInitialIndex,
    targetCardId,
    cardSetId,
    cardSetById: data.cardSetById,
    sortedCards: data.sortedCards,
    cardIndexById: data.cardIndexById,
    createCard: data.createCard,
    updateCard: data.updateCard,
    reorderCardsInCardSet: data.reorderCardsInCardSet,
    selectedCardSet: data.selectedCardSet,
    toastError,
    deviceScope: presentationTarget,
  });

  const paneWidth = useCardSetViewPaneWidth({ isGlobalEditing: state.isGlobalEditing, isDesktop, settings, cardSetId });

  const [activeScrollAnchorFace, setActiveScrollAnchorFace] = useState<ScrollAnchorFace | null>(null);
  const [layoutTransitionScrollAnchorRevision, setLayoutTransitionScrollAnchorRevision] = useState(0);
  const [scrollToActiveIndexRequestKey, setScrollToActiveIndexRequestKey] = useState(0);

  const layoutInteractionMode: CardSetInteractionMode = state.isGlobalEditing ? "edit" : "view";

  const splitFallbackLayoutMode = useMemo(() => resolveSplitFallbackLayoutModePreference(presentationTarget), [presentationTarget]);

  const navigationScrollRestorationKey = useMemo(() => buildNavigationScopeKey({ deviceScope: presentationTarget, cardSetId }), [cardSetId, presentationTarget]);

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
    enabled: isDesktop && state.cardsForPager.length > 0,
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

  const handleToggleViewMode = useCallback(() => {
    state.handleToggleViewMode();
  }, [state]);

  const handleNavigationScrollTopChange = useCallback((scrollTop: number) => {
    if (!cardSetId) return;

    setCardSetViewNavigationPreference({ deviceScope: presentationTarget, cardSetId }, { scrollTop });
  }, [cardSetId, presentationTarget]);

  useEffect(() => {
    if (!cardSetId || data.isLoading || state.cardsForPager.length === 0 || !state.selectedCard?.id) return;

    setCardSetViewNavigationPreference({ deviceScope: presentationTarget, cardSetId }, { cardId: state.selectedCard.id });
  }, [cardSetId, data.isLoading, presentationTarget, state.cardsForPager.length, state.selectedCard?.id]);

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

  const handleReorderCards = useCallback(async (orderedCardIds: string[]) => {
    if (!cardSetId) return;

    try {
      await state.reorderCardsInCardSet(cardSetId, orderedCardIds);
    } catch (error) {
      console.error("[CardSetView] Failed to reorder cards", error);
      toastError("カードの並び替えに失敗しました");
    }
  }, [cardSetId, state, toastError]);

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
    navigationScrollTop,
    navigationScrollRestorationKey,
    handleActiveScrollAnchorFaceChange,
    handleNavigationScrollTopChange,
    handleJumpToCard,
    handleToggleViewMode,
    handleChangeCardLayoutMode,
    handleReorderCards,
    layoutTransitionScrollAnchorRevision,
    scrollToActiveIndexRequestKey,
    handleSaveCurrentDisplayMode,
    effectiveCardLayoutMode: zoom.effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    splitFallbackLayoutMode,
  };
};



export { useCardSetViewScreenController };
