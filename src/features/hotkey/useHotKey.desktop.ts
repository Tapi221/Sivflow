import { useEffect } from "react";
import { isTypingTarget } from "@/features/hotkey/hotkeyGuards";

type UseHotKeyParams = {
  onToggleSidebar?: () => void;
  onToggleRightSidebar?: () => void;
};

export const useHotKeyDesktop = ({ onToggleRightSidebar, onToggleSidebar }: UseHotKeyParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        onToggleSidebar?.();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        onToggleRightSidebar?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleRightSidebar, onToggleSidebar]);
};
