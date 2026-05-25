import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import { dispatchCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";

export const useCardSetViewEditingBridge = (isGlobalEditing: boolean) => {
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
