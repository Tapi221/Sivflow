import { useEffect } from "react";

interface UseCardViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
}

export const useCardViewWindowEvents = ({
  handleToggleViewMode,
  createAndFocusCard,
}: UseCardViewWindowEventsOptions) => {
  useEffect(() => {
    window.addEventListener(
      "cardview:toggle-editing-request",
      handleToggleViewMode,
    );
    return () =>
      window.removeEventListener(
        "cardview:toggle-editing-request",
        handleToggleViewMode,
      );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const handler = () => {
      void createAndFocusCard();
    };

    window.addEventListener("cardview:create-card-request", handler);
    return () =>
      window.removeEventListener("cardview:create-card-request", handler);
  }, [createAndFocusCard]);
};