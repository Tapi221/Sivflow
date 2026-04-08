import { useEffect } from "react";

interface UseCardSetViewWindowEventsOptions {
  handleToggleViewMode: () => void;
  createAndFocusCard: () => Promise<boolean>;
}

const bindWindowEvent = (
  eventName: string,
  handler: EventListenerOrEventListenerObject,
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(eventName, handler);

  return () => {
    window.removeEventListener(eventName, handler);
  };
};

export const useCardSetViewWindowEvents = ({
  handleToggleViewMode,
  createAndFocusCard,
}: UseCardSetViewWindowEventsOptions) => {
  useEffect(() => {
    return bindWindowEvent(
      "cardsetview:toggle-editing-request",
      handleToggleViewMode,
    );
  }, [handleToggleViewMode]);

  useEffect(() => {
    const handler = () => {
      void createAndFocusCard();
    };

    return bindWindowEvent("cardsetview:create-card-request", handler);
  }, [createAndFocusCard]);
};
