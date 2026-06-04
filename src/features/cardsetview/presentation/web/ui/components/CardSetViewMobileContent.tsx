import type { CardSetViewContentProps } from "./cardSetViewContentProps";
import { CardSetViewMobile } from "./CardSetViewMobile";

export const CardSetViewMobileContent = ({
  controller,
}: CardSetViewContentProps) => {
  const { data, settings, state } = controller;

  return (
    <CardSetViewMobile
      cardsForPager={state.cardsForPager}
      selectedCardId={state.selectedCard?.id ?? null}
      safeCurrentIndex={state.safeCurrentIndex}
      isFlipped={state.isFlipped}
      isLoading={data.isLoading}
      cardSetName={data.selectedCardSet?.name ?? null}
      currentDisplayMode={state.currentDisplayMode}
      settings={settings}
      onIndexChange={state.setCurrentIndex}
      onFlip={state.handleFlip}
      onEdit={state.handleEdit}
      onCreateCard={state.createAndFocusCard}
      onToggleUncertainty={state.handleToggleUncertainty}
      onToggleBookmark={state.handleToggleBookmark}
    />
  );
};