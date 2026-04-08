import { useEffect, useState } from "react";

const CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY = "cardsetview.meta-panel-open";
const LEGACY_CARD_VIEW_META_PANEL_OPEN_STORAGE_KEY =
  "card-view.meta-panel-open";

const resolveInitialMetaOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const nextValue = window.localStorage.getItem(
    CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY,
  );

  if (nextValue != null) {
    return nextValue !== "false";
  }

  const legacyValue = window.localStorage.getItem(
    LEGACY_CARD_VIEW_META_PANEL_OPEN_STORAGE_KEY,
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
      CARD_SET_VIEW_META_PANEL_OPEN_STORAGE_KEY,
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  return {
    isMetaOpen,
    setIsMetaOpen,
  };
};
