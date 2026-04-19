import { useCallback, useMemo, useState } from "react";

import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
import {
  CARD_LAYOUT_MODE_LABELS,
  type CardLayoutMode,
  type CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import { useCardSetViewData } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewData";
import { useCardSetViewPaneWidth } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewPaneWidth";
import { useCardSetViewState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewState";
import { useCardSetViewWindowEvents } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewZoom";
import { useCardSetViewZoomInput } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewZoomInput";
import { useCardSetViewBreadcrumbs } from "@/features/cardsetview/presentation/web/infra/useCardSetViewBreadcrumbs";
import { useCardSetViewParams } from "@/features/cardsetview/presentation/web/infra/useCardSetViewParams";
import {
  buildWidthControl,
  resolveLastSyncedAtMs,
  resolveOverlayRight,
} from "@/features/cardsetview/presentation/web/ui/cardSetViewViewModels";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import {
  CARD_PANE_WIDTH_STEP_PX,
  CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT,
  CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT,
  CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT,
} from "@constants/shared/flashcard";
import { resolveSplitFallbackLayoutModePreference } from "@/services/cardLayoutFallbackPreferences";

type ScrollAnchorFace = "question" | "answer";

export const useCardSetViewScreenController = () => {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const presentationTarget = usePresentationTarget();
  const isDesktop = presentationTarget === "desktop";
  const { settings } = useUserSettings();

  const { cardSetId, initialIndex, targetCardId } = useCardSetViewParams();

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

  const [activeScrollAnchorFace, setActiveScrollAnchorFace] =
    useState<ScrollAnchorFace | null>(null);

  const [
    layoutTransitionScrollAnchorRevision,
    setLayoutTransitionScrollAnchorRevision,
  ] = useState(0);

  const paneWidth = useCardSetViewPaneWidth({
    isGlobalEditing: state.isGlobalEditing,
    isDesktop,
    isMetaOpen: state.isMetaOpen,
    currentIndex: state.currentIndex,
    settings,
    cardSetId,
  });

  const layoutInteractionMode: CardSetInteractionMode = state.isGlobalEditing
    ? "edit"
    : "view";
  const splitFallbackLayoutMode = useMemo(
    () => resolveSplitFallbackLayoutModePreference(presentationTarget),
    [presentationTarget],
  );

  const zoom = useCardSetViewZoom({
    deviceScope: presentationTarget,
    cardSetId,
    viewportRef: paneWidth.contentViewportRef,
    activeCardKey: [
      state.selectedCard?.id ?? "",
      state.currentDisplayMode,
      state.currentCardLayoutMode,
      layoutInteractionMode,
      state.isMetaOpen ? "meta-open" : "meta-closed",
    ].join(":"),
    displayMode: state.currentDisplayMode,
    interactionMode: layoutInteractionMode,
    requestedCardLayoutMode: state.currentCardLayoutMode,
    splitFallbackLayoutMode,
  });

  useCardSetViewZoomInput({
    containerRef: paneWidth.contentViewportRef,
    enabled: isDesktop,
    zoomPercent: zoom.committedZoomPercent,
    minZoomPercent: zoom.minZoomPercent,
    maxZoomPercent: zoom.maxZoomPercent,
    presentationWidthPx: zoom.presentationWidthPx,
    maxPresentationWidthPx: zoom.maxPresentationWidthPx,
    cardLayoutMode: zoom.effectiveCardLayoutMode,
    wheelZoomStepPercent: CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT,
    gestureZoomStepPercent: CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT,
    onZoomPercentPreview: zoom.setPreviewZoomPercent,
    onZoomPercentCommit: zoom.commitZoomPercent,
    onZoomPreviewClear: zoom.clearPreviewZoomPercent,
  });

  useCardSetViewBreadcrumbs({
    selectedCardSet: data.selectedCardSet,
    selectedCard: state.selectedCard,
    sortedCards: data.sortedCards,
    folders: data.folders,
    setExtraCrumbs,
  });

  useCardSetViewWindowEvents({
    handleToggleViewMode: state.handleToggleViewMode,
    createAndFocusCard: state.createAndFocusCard,
  });

  const widthControl = buildWidthControl({
    isDesktop,
    isGlobalEditing: state.isGlobalEditing,
    activePaneWidthPx: paneWidth.activePaneWidthPx,
    activePaneMinWidthPx: paneWidth.activePaneMinWidthPx,
    activePaneMaxWidthPx: paneWidth.activePaneMaxWidthPx,
    activePaneDisplayedDefaultWidthPx:
      paneWidth.activePaneDisplayedDefaultWidthPx,
    previewPaneWidth: paneWidth.previewPaneWidth,
    persistPaneWidth: paneWidth.persistPaneWidth,
    stepPaneWidth: paneWidth.stepPaneWidth,
    resetActivePaneWidth: paneWidth.resetActivePaneWidth,
    activePaneMode: paneWidth.activePaneMode,
    widthStepPx: CARD_PANE_WIDTH_STEP_PX,
  });

  const overlayRight = resolveOverlayRight({
    isDesktop,
    isMetaOpen: state.isMetaOpen,
  });

  const resolvedLastSyncedAtMs = resolveLastSyncedAtMs({
    activeSyncStatus: state.activeSyncStatus,
    selectedCard: state.selectedCard as {
      id?: string | null;
      updatedAt?: unknown;
      createdAt?: unknown;
    } | null,
  });

  const topLeftZoomControl = isDesktop
    ? {
        value: zoom.zoomPercent,
        min: zoom.minZoomPercent,
        max: zoom.maxZoomPercent,
        step: CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT,
        onPreviewChange: zoom.setPreviewZoomPercent,
        onCommit: zoom.commitZoomPercent,
        onStepDown: zoom.stepDown,
        onStepUp: zoom.stepUp,
      }
    : null;

  const disabledCardLayoutModes = useMemo(
    () => ({
      stack: false,
      flip: false,
      split: !zoom.canUseSplit,
    }),
    [zoom.canUseSplit],
  );

  const layoutConstraintIndicatorLabel = useMemo(() => {
    if (!zoom.showConstraintIndicator) {
      return null;
    }

    if (
      state.currentCardLayoutMode === "split" &&
      zoom.effectiveCardLayoutMode !== "split"
    ) {
      return `画面制約で${CARD_LAYOUT_MODE_LABELS[zoom.effectiveCardLayoutMode]}表示中`;
    }

    return "画面制約で縮小中";
  }, [
    state.currentCardLayoutMode,
    zoom.effectiveCardLayoutMode,
    zoom.showConstraintIndicator,
  ]);

  const {
    currentCardLayoutMode,
    currentDisplayMode,
    isFlipped,
    setCurrentCardFace,
    setCurrentCardLayoutMode,
  } = state;

  const handleSaveCurrentDisplayMode = useCallback(async () => {
    if (!cardSetId) {
      return;
    }

    try {
      await saveDefaultDisplayMode({
        cardSetId,
        currentDisplayMode,
        updateCardSet: data.updateCardSet,
      });
    } catch (error) {
      console.error("[CardSetView] Failed to save default display mode", error);
      toastError("表示モードの保存に失敗しました");
    }
  }, [cardSetId, currentDisplayMode, data.updateCardSet, toastError]);

  const handleActiveScrollAnchorFaceChange = useCallback(
    (face: ScrollAnchorFace | null) => {
      setActiveScrollAnchorFace(face);
    },
    [],
  );

  const handleChangeCardLayoutMode = useCallback(
    (nextMode: CardLayoutMode) => {
      if (nextMode === currentCardLayoutMode) {
        return;
      }

      if (nextMode === "flip" && currentCardLayoutMode !== "flip") {
        setCurrentCardFace(
          activeScrollAnchorFace ?? (isFlipped ? "answer" : "question"),
        );
        setLayoutTransitionScrollAnchorRevision((prev) => prev + 1);
      }

      setCurrentCardLayoutMode(nextMode);
    },
    [
      activeScrollAnchorFace,
      currentCardLayoutMode,
      isFlipped,
      setCurrentCardFace,
      setCurrentCardLayoutMode,
      setLayoutTransitionScrollAnchorRevision,
    ],
  );

  return {
    cardSetId,
    presentationTarget,
    isDesktop,
    settings,
    data,
    state,
    paneWidth,
    zoom,
    widthControl,
    overlayRight,
    resolvedLastSyncedAtMs,
    topLeftZoomControl,
    handleActiveScrollAnchorFaceChange,
    handleChangeCardLayoutMode,
    layoutTransitionScrollAnchorRevision,
    handleSaveCurrentDisplayMode,
    effectiveCardLayoutMode: zoom.effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    splitFallbackLayoutMode,
  };
};
