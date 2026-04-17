import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";

export type CardSetViewEditingDraftPatch = {
  cardId: string;
  patch: {
    title?: string;
    isDraft?: boolean;
    tags?: string[];
  };
};

export type CardSetViewWindowEventMap = {
  [CARD_SET_VIEW_EVENTS.editingChange]: boolean;
  [CARD_SET_VIEW_EVENTS.editingDraftPatch]: CardSetViewEditingDraftPatch;
  [CARD_SET_VIEW_EVENTS.createCardRequest]: undefined;
  [CARD_SET_VIEW_EVENTS.toggleEditingRequest]: undefined;
};

type CardSetViewWindowEventName = keyof CardSetViewWindowEventMap;

export const dispatchCardSetViewWindowEvent = <
  TEventName extends CardSetViewWindowEventName,
>(
  eventName: TEventName,
  detail: CardSetViewWindowEventMap[TEventName],
) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const subscribeCardSetViewWindowEvent = <
  TEventName extends CardSetViewWindowEventName,
>(
  eventName: TEventName,
  listener: (detail: CardSetViewWindowEventMap[TEventName]) => void,
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler: EventListener = (event) => {
    const detail = (event as CustomEvent<CardSetViewWindowEventMap[TEventName]>)
      .detail;
    listener(detail);
  };

  window.addEventListener(eventName, handler);
  return () => {
    window.removeEventListener(eventName, handler);
  };
};
