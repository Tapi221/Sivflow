import { useEffect } from "react";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";

export const useCardSetViewEditingBridge = (isGlobalEditing: boolean) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(CARD_SET_VIEW_EVENTS.editingChange, {
        detail: isGlobalEditing,
      }),
    );
  }, [isGlobalEditing]);
};
