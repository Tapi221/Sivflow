import { CARD_SET_VIEW_EVENTS } from "@/features/cardsetview/events/cardSetViewEvents.constants";



type CardSetViewEditingDraftPatch = {
  cardId: string;
  patch: {
    title?: string;
    isDraft?: boolean;
    tags?: string[];
  };
};
type CardSetViewWindowEventMap = {
  [CARD_SET_VIEW_EVENTS.editingChange]: boolean;
  [CARD_SET_VIEW_EVENTS.metaOpenChange]: boolean;
  [CARD_SET_VIEW_EVENTS.editingDraftPatch]: CardSetViewEditingDraftPatch;
  [CARD_SET_VIEW_EVENTS.createCardRequest]: undefined;
  [CARD_SET_VIEW_EVENTS.toggleEditingRequest]: undefined;
  [CARD_SET_VIEW_EVENTS.toggleMetaPanelRequest]: undefined;
};
type CardSetViewWindowEventName = keyof CardSetViewWindowEventMap;



const dispatchCardSetViewWindowEvent = <TEventName extends CardSetViewWindowEventName>(eventName: TEventName, detail: CardSetViewWindowEventMap[TEventName]) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};
const subscribeCardSetViewWindowEvent = <TEventName extends CardSetViewWindowEventName>(eventName: TEventName, listener: (detail: CardSetViewWindowEventMap[TEventName]) => void) => {
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



export { dispatchCardSetViewWindowEvent, subscribeCardSetViewWindowEvent };


export type { CardSetViewEditingDraftPatch, CardSetViewWindowEventMap };
