import { useEffect } from "react";
import { isPrimaryShortcut, isTypingTarget } from "./hotkeyGuards";



type UseTreeViewSidebarHotkeyParams = {
  onToggle: () => void;
};



const useTreeViewSidebarHotkey = ({ onToggle }: UseTreeViewSidebarHotkeyParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!isPrimaryShortcut(event, "b")) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggle]);
};



export { useTreeViewSidebarHotkey };
