import { CardSetViewMobile } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMobile";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";

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
