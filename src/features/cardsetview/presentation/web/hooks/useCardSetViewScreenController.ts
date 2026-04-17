import { useCallback, useMemo } from "react";

import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
import {
  CARD_LAYOUT_MODE_LABELS,
  type CardSetInteractionMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import { useCardSetViewData } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewData";
import { useCardSetViewPaneWidth } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewPaneWidth";
import { useCardSetViewState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewState";
import { useCardSetViewWindowEvents } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewZoom";
import { useCardSetViewBreadcrumbs } from "@/features/cardsetview/presentation/web/infra/useCardSetViewBreadcrumbs";
import { useCardSetViewParams } from "@/features/cardsetview/presentation/web/infra/useCardSetViewParams";
import {
  buildWidthControl,
  resolveLastSyncedAtMs,
  resolveOverlayRight,
} from "@/features/cardsetview/presentation/web/ui/cardSetViewViewModels";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { CARD_PANE_WIDTH_STEP_PX } from "@constants/shared/flashcard";
import { resolveSplitFallbackLayoutModePreference } from "@/services/cardLayoutFallbackPreferences";

export const useCardSetViewScreenController = () => {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const presentationTarget = usePresentationTarget();
  const isDesktop = presentationTarget === "desktop";
  const { settings } = useUserSettings();

  const { folderId, cardSetId, initialIndex, targetCardId } =
    useCardSetViewParams();

  const data = useCardSetViewData({ folderId, cardSetId });

  const state = useCardSetViewState({
    initialIndex,
    targetCardId,
    folderId,
    cardSetId,
    cardSetById: data.cardSetById,
    sortedCards: data.sortedCards,
    cardIndexById: data.cardIndexById,
    createCard: data.createCard,
    updateCard: data.updateCard,
    selectedCardSet: data.selectedCardSet,
    isLoading: data.isLoading,
    toastError,
    deviceScope: presentationTarget,
  });

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

  useCardSetViewBreadcrumbs({
    folderId,
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

  const topLeftZoomControl =
    isDesktop && !state.isGlobalEditing
      ? {
          value: zoom.zoomPercent,
          min: zoom.minZoomPercent,
          max: zoom.maxZoomPercent,
          step: 5,
          defaultValue: zoom.defaultZoomPercent,
          onChange: zoom.setZoomPercent,
          onStepDown: zoom.stepDown,
          onStepUp: zoom.stepUp,
          onReset: zoom.reset,
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

  const handleSaveCurrentDisplayMode = useCallback(async () => {
    if (!cardSetId) {
      return;
    }

    try {
      await saveDefaultDisplayMode({
        cardSetId,
        currentDisplayMode: state.currentDisplayMode,
        updateCardSet: data.updateCardSet,
      });
    } catch (error) {
      console.error("[CardSetView] Failed to save default display mode", error);
      toastError("表示モードの保存に失敗しました");
    }
  }, [cardSetId, data.updateCardSet, state.currentDisplayMode, toastError]);

  return {
    folderId,
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
    handleSaveCurrentDisplayMode,
    effectiveCardLayoutMode: zoom.effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    splitFallbackLayoutMode,
  };
};
