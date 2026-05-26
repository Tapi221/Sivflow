import { useEffect } from "react";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { isPrimaryShortcut, isTypingTarget } from "@/features/hotkey/hotkeyGuards";
import { hasOpenModalDialog } from "@/features/hotkey/modalGuards";

export const useGlobalSearchHotkey = () => {
  const isOpen = useGlobalSearchStore((state) => state.isOpen);
  const toggle = useGlobalSearchStore((state) => state.toggle);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (!isPrimaryShortcut(event, "k")) return;
      if (!isOpen && isTypingTarget(event.target)) return;
      if (!isOpen && hasOpenModalDialog()) return;

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
