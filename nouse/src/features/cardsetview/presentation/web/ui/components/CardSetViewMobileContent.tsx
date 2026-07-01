import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import type { CardSetViewContentProps } from "./cardSetViewContentProps";



const CardSetViewMobileContent = ({ controller }: CardSetViewContentProps) => {
  const { folderId, cardSetId, settings, data, state, zoom, effectiveCardLayoutMode } = controller;

  return (
    <CardSetViewDesktop
      isLoading={data.isLoading}
      isGlobalEditing={state.isGlobalEditing}
      flippedCardIds={state.flippedCardIds}
      cardsForPager={state.cardsForPager}
      safeCurrentIndex={state.safeCurrentIndex}
      settings={settings}
      currentDisplayMode={state.currentDisplayMode}
      currentCardLayoutMode={effectiveCardLayoutMode}
      folderId={folderId}
      layoutTransitionScrollAnchorRevision={controller.layoutTransitionScrollAnchorRevision}
      scrollToActiveIndexRequestKey={controller.scrollToActiveIndexRequestKey}
      cardSetId={cardSetId}
      cardSetName={data.selectedCardSet?.name ?? null}
      viewZoomScale={zoom.zoomScale}
      fixedCardWidthPx={zoom.fixedCardWidthPx}
      fluidAvailableWidthPx={zoom.availableWidthPx}
      onActiveIndexChange={state.handlePagerIndexChange}
      onFlip={state.handleFlip}
      onActiveScrollAnchorFaceChange={controller.handleActiveScrollAnchorFaceChange}
      onCreateCard={() => {
        void state.createAndFocusCard();
      }}
      onReorderCards={controller.handleReorderCards}
      onToggleUncertainty={state.handleToggleUncertainty}
      onToggleBookmark={state.handleToggleBookmark}
    />
  );
};



export { CardSetViewMobileContent };
