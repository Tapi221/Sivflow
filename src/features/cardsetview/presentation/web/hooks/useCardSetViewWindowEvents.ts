import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import { subscribeCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";

interface UseCardSetViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  handleToggleMetaPanel: () => void;
  createAndFocusCard: () => Promise<boolean>;
}

export const useCardSetViewWindowEvents = ({
  handleToggleViewMode,
  handleToggleMetaPanel,
  createAndFocusCard,
}: UseCardSetViewWindowEventsOptions) => {
  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.toggleEditingRequest,
      () => {
        handleToggleViewMode();
      },
    );
  }, [handleToggleViewMode]);

  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.toggleMetaPanelRequest,
      () => {
        handleToggleMetaPanel();
      },
    );
  }, [handleToggleMetaPanel]);

  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.createCardRequest,
      () => {
        void createAndFocusCard();
      },
    );
  }, [createAndFocusCard]);
};
