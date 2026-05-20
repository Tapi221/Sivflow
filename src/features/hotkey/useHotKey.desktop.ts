import { useEffect } from "react";

type UseHotKeyParams = {
  onToggleSidebar?: () => void;
  onToggleRightSidebar?: () => void;
};

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

export const useHotKeyDesktop = (_params: UseHotKeyParams) => {
  useEffect(() => {
    const handleKeyDown = (_event: KeyboardEvent) => {

      if (isEditableElement(_event.target)) return;
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
};