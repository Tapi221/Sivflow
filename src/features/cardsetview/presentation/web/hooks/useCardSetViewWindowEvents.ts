import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@/features/cardsetview/events/cardSetViewEvents.constants";
import { subscribeCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";



interface UseCardSetViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
}



const useCardSetViewWindowEvents = ({ handleToggleViewMode, createAndFocusCard }: UseCardSetViewWindowEventsOptions) => {
  useEffect(() => {
    return subscribeCardSetViewWindowEvent(CARD_SET_VIEW_EVENTS.toggleEditingRequest, () => {
      handleToggleViewMode();
    },
    );
  }, [handleToggleViewMode]);

  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.createCardRequest,
      () => {
        void createAndFocusCard();
      },
    );
  }, [createAndFocusCard]);
};



export { useCardSetViewWindowEvents };
