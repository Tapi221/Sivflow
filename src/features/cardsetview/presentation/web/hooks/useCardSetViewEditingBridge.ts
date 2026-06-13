import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@/features/cardsetview/events/cardSetViewEvents.constants";
import { dispatchCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";



const useCardSetViewEditingBridge = (isGlobalEditing: boolean) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    dispatchCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.editingChange,
      isGlobalEditing,
    );
  }, [isGlobalEditing]);
};



export { useCardSetViewEditingBridge };
