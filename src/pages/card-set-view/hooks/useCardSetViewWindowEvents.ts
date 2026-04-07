import { useEffect } from "react";

interface UseCardSetViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
}

export const useCardSetViewWindowEvents = ({
  handleToggleViewMode,
  createAndFocusCard,
}: UseCardSetViewWindowEventsOptions) => {
  useEffect(() => {
    window.addEventListener(
      "cardsetview:toggle-editing-request",
      handleToggleViewMode,
    );
    return () =>
      window.removeEventListener(
        "cardsetview:toggle-editing-request",
        handleToggleViewMode,
      );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const handler = () => {
      void createAndFocusCard();
    };

    window.addEventListener("cardsetview:create-card-request", handler);
    return () =>
      window.removeEventListener("cardsetview:create-card-request", handler);
  }, [createAndFocusCard]);
};
