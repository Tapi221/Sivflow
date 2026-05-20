import { useEffect } from "react";

import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";

import {
  hasOpenModalDialog,
  isTextInputTarget,
} from "@/components/folder/explorer/model/utils";

export const useGlobalSearchHotkey = () => {
  const isOpen = useGlobalSearchStore((state) => state.isOpen);
  const toggle = useGlobalSearchStore((state) => state.toggle);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const pressedKey = event.key.toLowerCase();
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        pressedKey === "k";

      if (!isSearchShortcut) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (!isOpen && isTextInputTarget(target)) {
        return;
      }

      if (!isOpen && hasOpenModalDialog()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      toggle();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, toggle]);
};
