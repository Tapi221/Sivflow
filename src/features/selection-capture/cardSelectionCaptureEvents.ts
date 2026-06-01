import type { SelectionCaptureArea, SelectionCaptureRect } from "./selectionCapture.types";

export type CardSelectionCaptureSide = "question" | "answer";

export type CardSelectionCaptureTaskResult = string | void;

export type CardSelectionCaptureEventPayload = {
  readonly blob: Blob;
  readonly rect: SelectionCaptureRect;
  readonly area?: SelectionCaptureArea;
  readonly target: HTMLElement;
  readonly side: CardSelectionCaptureSide;
  readonly ocrText: string | null;
};

export type CardSelectionCaptureEventDetail = CardSelectionCaptureEventPayload & {
  readonly area: SelectionCaptureArea;
  addTask: (task: Promise<CardSelectionCaptureTaskResult>) => void;
};

export type DispatchedCardSelectionCaptureEvent = {
  handled: boolean;
  tasks: Promise<CardSelectionCaptureTaskResult>[];
};

export const CARD_SELECTION_CAPTURE_EVENT = "manifolia:card-selection-capture";

export const dispatchCardSelectionCaptureEvent = (
  payload: CardSelectionCaptureEventPayload,
): DispatchedCardSelectionCaptureEvent => {
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
