import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";

export const CardSetViewDesktopContent = ({
  controller,
}: CardSetViewContentProps) => {
  const { folderId, cardSetId, settings, data, state, paneWidth, zoom } =
    controller;

  return (
    <CardSetViewDesktop
      isLoading={data.isLoading}
      isGlobalEditing={state.isGlobalEditing}
      flippedCardIds={state.flippedCardIds}
      cardsForPager={state.cardsForPager}
      selectedCardId={state.selectedCard?.id ?? null}
      safeCurrentIndex={state.safeCurrentIndex}
      settings={settings}
      editPaneWidthPx={paneWidth.activePaneRenderWidthPx}
      currentDisplayMode={state.currentDisplayMode}
      currentCardLayoutMode={state.currentCardLayoutMode}
      folderId={folderId}
      cardSetId={cardSetId}
      viewZoomScale={zoom.zoomScale}
      fixedCardWidthPx={zoom.fixedCardWidthPx}
      fluidAvailableWidthPx={zoom.availableWidthPx}
      onActiveIndexChange={state.handlePagerIndexChange}
      onFlip={state.handleFlip}
      onToggleUncertainty={state.handleToggleUncertainty}
      onToggleBookmark={state.handleToggleBookmark}
      onSyncStatusChange={state.handleActiveSyncStatusChange}
    />
  );
};
