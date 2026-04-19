import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";

export const CardSetViewDesktopContent = ({
  controller,
}: CardSetViewContentProps) => {
  const {
    folderId,
    cardSetId,
    settings,
    data,
    state,
    zoom,
    effectiveCardLayoutMode,
  } = controller;

  return (
    <CardSetViewDesktop
      isLoading={data.isLoading}
      isGlobalEditing={state.isGlobalEditing}
      flippedCardIds={state.flippedCardIds}
      cardsForPager={state.cardsForPager}
      selectedCardId={state.selectedCard?.id ?? null}
      safeCurrentIndex={state.safeCurrentIndex}
      settings={settings}
      currentDisplayMode={state.currentDisplayMode}
      currentCardLayoutMode={effectiveCardLayoutMode}
      folderId={folderId}
      layoutTransitionScrollAnchorRevision={
        controller.layoutTransitionScrollAnchorRevision
      }
      cardSetId={cardSetId}
      viewZoomScale={zoom.zoomScale}
      zoomPreviewScaleFactor={zoom.previewScaleFactor}
      isZoomPreviewActive={zoom.isZoomPreviewActive}
      fixedCardWidthPx={zoom.fixedCardWidthPx}
      fluidAvailableWidthPx={zoom.availableWidthPx}
      onActiveIndexChange={state.handlePagerIndexChange}
      onFlip={state.handleFlip}
      onActiveScrollAnchorFaceChange={
        controller.handleActiveScrollAnchorFaceChange
      }
      onToggleUncertainty={state.handleToggleUncertainty}
      onToggleBookmark={state.handleToggleBookmark}
      onSyncStatusChange={state.handleActiveSyncStatusChange}
    />
  );
};
