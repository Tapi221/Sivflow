import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";

import { CARD_PANE_WIDTH_STEP_PX } from "@/routes/constants";

import {
  buildWidthControl,
  resolveLastSyncedAtMs,
  resolveOverlayRight,
} from "@/features/cardsetview/application/cardSetViewPresentation";
import { useCardSetViewBreadcrumbs } from "@/features/cardsetview/hooks/useCardSetViewBreadcrumbs";
import { useCardSetViewData } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewData";
import { useCardSetViewPaneWidth } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewPaneWidth";
import { useCardSetViewParams } from "@/features/cardsetview/hooks/useCardSetViewParams";
import { useCardSetViewState } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewState";
import { useCardSetViewWindowEvents } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "@/features/cardsetview/hooks/useCardSetViewZoom";

export const useCardSetViewScreenController = () => {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const isDesktop = useIsDesktopRuntime();
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

  return {
    folderId,
    cardSetId,
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
  };
};
