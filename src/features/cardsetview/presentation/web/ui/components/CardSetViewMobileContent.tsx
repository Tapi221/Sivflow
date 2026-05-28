import type { CardSetViewContentProps } from "./cardSetViewContentProps";
import { CardSetViewMobile } from "./CardSetViewMobile";

export const CardSetViewMobileContent = ({
  controller,
}: CardSetViewContentProps) => {
  const { settings, state } = controller;

  return (
    <CardSetViewMobile
      cardsForPager={state.cardsForPager}
      selectedCardId={state.selectedCard?.id ?? null}
      safeCurrentIndex={state.safeCurrentIndex}
      isFlipped={state.isFlipped}
      currentDisplayMode={state.currentDisplayMode}
      settings={settings}
      onIndexChange={state.setCurrentIndex}
      onFlip={state.handleFlip}
      onEdit={state.handleEdit}
      onToggleUncertainty={state.handleToggleUncertainty}
      onToggleBookmark={state.handleToggleBookmark}
    />
  );
};
