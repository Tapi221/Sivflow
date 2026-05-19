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

const isRightSidebarShortcut = (event: KeyboardEvent) => {
  const key = event.key;

  return (
    key === "\\" ||
    key === "¥" ||
    key === "￥" ||
    event.code === "Backslash" ||
    event.code === "IntlYen"
  );
};

export const useHotKeyDesktop = ({
  onToggleSidebar,
  onToggleRightSidebar,
}: UseHotKeyParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey) {
        return;
      }

      if (event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      if (isEditableElement(event.target)) {
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        onToggleSidebar?.();
        return;
      }

      if (isRightSidebarShortcut(event)) {
        event.preventDefault();
        onToggleRightSidebar?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleSidebar, onToggleRightSidebar]);
};
