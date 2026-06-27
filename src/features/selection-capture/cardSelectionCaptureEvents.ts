import type { SelectionCaptureArea, SelectionCaptureRect } from "./selectionCapture.types";



type CardSelectionCaptureSide = "question" | "answer";
type CardSelectionCaptureTaskResult = string | void;
type CardSelectionCaptureEventPayload = {
  readonly blob: Blob;
  readonly rect: SelectionCaptureRect;
  readonly area?: SelectionCaptureArea;
  readonly target: HTMLElement;
  readonly side: CardSelectionCaptureSide;
  readonly ocrText: string | null;
};
type CardSelectionCaptureEventDetail = CardSelectionCaptureEventPayload & { readonly area: SelectionCaptureArea;
  addTask: (task: Promise<CardSelectionCaptureTaskResult>) => void;
};
type DispatchedCardSelectionCaptureEvent = {
  handled: boolean;
  tasks: Promise<CardSelectionCaptureTaskResult>[];
};



const CARD_SELECTION_CAPTURE_EVENT = "sivflow:card-selection-capture";



const dispatchCardSelectionCaptureEvent = (payload: CardSelectionCaptureEventPayload): DispatchedCardSelectionCaptureEvent => {
  const tasks: Promise<CardSelectionCaptureTaskResult>[] = [];
  const detail: CardSelectionCaptureEventDetail = {
    ...payload,
    area: payload.area ?? { shape: "rectangle", rect: payload.rect },
    addTask: (task) => {
      tasks.push(task);
    },
  };

  const event = new CustomEvent<CardSelectionCaptureEventDetail>(
    CARD_SELECTION_CAPTURE_EVENT,
    {
      detail,
      cancelable: true,
    },
  );

  document.dispatchEvent(event);

  return {
    handled: event.defaultPrevented || tasks.length > 0,
    tasks,
  };
};



export { CARD_SELECTION_CAPTURE_EVENT, dispatchCardSelectionCaptureEvent };


export type { CardSelectionCaptureSide, CardSelectionCaptureTaskResult, CardSelectionCaptureEventPayload, CardSelectionCaptureEventDetail, DispatchedCardSelectionCaptureEvent };
