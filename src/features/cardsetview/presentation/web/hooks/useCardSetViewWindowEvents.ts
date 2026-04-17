import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";

interface UseCardSetViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
}

export const useCardSetViewWindowEvents = ({
  handleToggleViewMode,
  createAndFocusCard,
}: UseCardSetViewWindowEventsOptions) => {
  useEffect(() => {
    window.addEventListener(
      CARD_SET_VIEW_EVENTS.toggleEditingRequest,
      handleToggleViewMode,
    );
    return () =>
      window.removeEventListener(
        CARD_SET_VIEW_EVENTS.toggleEditingRequest,
        handleToggleViewMode,
      );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const handler = () => {
      void createAndFocusCard();
    };

    window.addEventListener(CARD_SET_VIEW_EVENTS.createCardRequest, handler);
    return () =>
      window.removeEventListener(
        CARD_SET_VIEW_EVENTS.createCardRequest,
        handler,
      );
  }, [createAndFocusCard]);
};
