import { useEffect, useState } from "react";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";

const resolveInitialMetaOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const nextValue = window.localStorage.getItem(
    WEB_STORAGE_KEYS.cardSetViewMetaPanelOpen,
  );

  if (nextValue != null) {
    return nextValue !== "false";
  }

  const legacyValue = window.localStorage.getItem(
    WEB_STORAGE_KEYS.legacyCardViewMetaPanelOpen,
  );

  if (legacyValue != null) {
    return legacyValue !== "false";
  }

  return true;
};

export const useCardSetViewMetaPanelState = () => {
  const [isMetaOpen, setIsMetaOpen] = useState(resolveInitialMetaOpen);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      WEB_STORAGE_KEYS.cardSetViewMetaPanelOpen,
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  return {
    isMetaOpen,
    setIsMetaOpen,
  };
};
