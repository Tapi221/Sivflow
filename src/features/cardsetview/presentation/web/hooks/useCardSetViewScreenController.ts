import { useCallback } from "react";

import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
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
import { CARD_PANE_WIDTH_STEP_PX } from "@/routes/constants";

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

  const zoom = useCardSetViewZoom({
    cardSetId,
    viewportRef: paneWidth.contentViewportRef,
    activeCardKey: `${state.selectedCard?.id ?? ""}:${state.currentDisplayMode}`,
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
  };
};
