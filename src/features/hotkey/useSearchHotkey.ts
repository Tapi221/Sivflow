import { useEffect } from "react";
import { isPrimaryShortcut, isTypingTarget } from "./hotkeyGuards";
import { hasOpenModalDialog } from "./modalGuards";
import { useSearchStore } from "@/features/search/store/useSearchStore";



const useSearchHotkey = () => {
  const isOpen = useSearchStore((state) => state.isOpen);
  const toggle = useSearchStore((state) => state.toggle);

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



export { useSearchHotkey };
