import type { CSSProperties } from "react";
import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import type { CardSetViewContentProps } from "./cardSetViewContentProps";



type CardSetViewChromeResetStyle = CSSProperties & {
  "--card-selected-surface": string;
  "--card-border-selected": string;
  "--card-shadow-selected": string;
  "--card-selected-outline-width": string;
  "--card-selected-outline-neutral": string;
  "--card-selected-outline-accent": string;
};



const cardSetViewChromeResetStyle: CardSetViewChromeResetStyle = {
  "--card-selected-surface": "#fff",
  "--card-border-selected": "var(--card-border-default, rgba(15, 23, 42, 0.08))",
  "--card-shadow-selected":
    "0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 18px rgba(15, 23, 42, 0.06)",
  "--card-selected-outline-width": "0px",
  "--card-selected-outline-neutral": "transparent",
  "--card-selected-outline-accent": "transparent",
};



const CardSetViewDesktopContent = ({ controller }: CardSetViewContentProps) => {
  const { folderId, cardSetId, settings, data, state, zoom, effectiveCardLayoutMode } = controller;

  return (
    <div className="h-full min-h-0 w-full" style={cardSetViewChromeResetStyle}>
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
        layoutTransitionScrollAnchorRevision={
          controller.layoutTransitionScrollAnchorRevision
        }
        scrollToActiveIndexRequestKey={controller.scrollToActiveIndexRequestKey}
        cardSetId={cardSetId}
        cardSetName={data.selectedCardSet?.name ?? null}
        viewZoomScale={zoom.zoomScale}
        fixedCardWidthPx={zoom.fixedCardWidthPx}
        fluidAvailableWidthPx={zoom.availableWidthPx}
        onActiveIndexChange={state.handlePagerIndexChange}
        onFlip={state.handleFlip}
        onActiveScrollAnchorFaceChange={
          controller.handleActiveScrollAnchorFaceChange
        }
        onCreateCard={() => {
          void state.createAndFocusCard();
        }}
        onReorderCards={controller.handleReorderCards}
        onToggleUncertainty={state.handleToggleUncertainty}
        onToggleBookmark={state.handleToggleBookmark}
      />
    </div>
  );
};



export { CardSetViewDesktopContent };
