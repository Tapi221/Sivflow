import type { SelectionCaptureRect } from "./selectionCapture.types";

export type CardSelectionCaptureSide = "question" | "answer";

export type CardSelectionCaptureTaskResult = string | void;

export type CardSelectionCaptureEventDetail = {
  readonly blob: Blob;
  readonly rect: SelectionCaptureRect;
  readonly target: HTMLElement;
  readonly side: CardSelectionCaptureSide;
  readonly ocrText: string | null;
  addTask: (task: Promise<CardSelectionCaptureTaskResult>) => void;
};

export type DispatchedCardSelectionCaptureEvent = {
  handled: boolean;
  tasks: Promise<CardSelectionCaptureTaskResult>[];
};

export const CARD_SELECTION_CAPTURE_EVENT = "manifolia:card-selection-capture";

export const dispatchCardSelectionCaptureEvent = (
  payload: Omit<CardSelectionCaptureEventDetail, "addTask">,
): DispatchedCardSelectionCaptureEvent => {
  const tasks: Promise<CardSelectionCaptureTaskResult>[] = [];
  const detail: CardSelectionCaptureEventDetail = {
    ...payload,
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
