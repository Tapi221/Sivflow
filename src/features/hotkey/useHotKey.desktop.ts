import { useEffect } from "react";
import { isPrimaryShiftShortcut, isTypingTarget } from "./hotkeyGuards";



type UseHotKeyParams = {
  onToggleRightSidebar?: () => void;
};



const useHotKeyDesktop = ({ onToggleRightSidebar }: UseHotKeyParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      if (!isPrimaryShiftShortcut(event, "b")) return;

      event.preventDefault();
      onToggleRightSidebar?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleRightSidebar]);
};



export { useHotKeyDesktop };
