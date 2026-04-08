import { useEffect } from "react";

export const useCardSetViewEditingBridge = (isGlobalEditing: boolean) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("cardsetview:editing-change", {
        detail: isGlobalEditing,
      }),
    );
  }, [isGlobalEditing]);
};
