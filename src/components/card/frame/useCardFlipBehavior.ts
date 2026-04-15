import React from "react";

export const TAP_MOVE_CANCEL_THRESHOLD_PX = 8;

export const shouldIgnoreFlipTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return Boolean(
    element.closest(
      'button, a, input, textarea, select, label, [data-card-no-flip="true"]',
    ),
  );
};

type PointerGestureState = Readonly<{
  pointerId: number | null;
  startX: number;
  startY: number;
  moved: boolean;
}>;

const createInitialPointerGestureState = (): PointerGestureState => ({
  pointerId: null,
  startX: 0,
  startY: 0,
  moved: false,
});

export type UseCardFlipBehaviorParams = Readonly<{
  isCardClickable: boolean;
  previewMode: boolean;
  onFlip?: () => void;
  onPreviewFlip?: () => void;
  isModalBlockingFlip: boolean;
  isInkEditingActive: boolean;
}>;

export type UseCardFlipBehaviorResult = Readonly<{
  handleFlip: (event?: React.MouseEvent<HTMLDivElement>) => void;
  handleKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  handlePointerDownCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerMoveCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerUpCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerCancelCapture: React.PointerEventHandler<HTMLDivElement>;
}>;

export const useCardFlipBehavior = ({
  isCardClickable,
  previewMode,
  onFlip,
  onPreviewFlip,
  isModalBlockingFlip,
  isInkEditingActive,
}: UseCardFlipBehaviorParams): UseCardFlipBehaviorResult => {
  const suppressNextFlipRef = React.useRef(false);
  const pointerGestureRef = React.useRef<PointerGestureState>(
    createInitialPointerGestureState(),
  );

  const shouldHandleFlip = previewMode || (isCardClickable && Boolean(onFlip));

  const resetPointerGesture = React.useCallback(() => {
    pointerGestureRef.current = createInitialPointerGestureState();
  }, []);

  const finishPointerGesture = React.useCallback(
    (pointerId: number | null) => {
      const state = pointerGestureRef.current;
      if (state.pointerId == null) return;
      if (pointerId != null && state.pointerId !== pointerId) return;

      if (state.moved) {
        suppressNextFlipRef.current = true;
      }

      resetPointerGesture();
    },
    [resetPointerGesture],
  );

  const handleFlip = React.useCallback(
    (event?: React.MouseEvent<HTMLDivElement>) => {
      if (!shouldHandleFlip) return;

      if (suppressNextFlipRef.current) {
        suppressNextFlipRef.current = false;
        return;
      }

      if (event && shouldIgnoreFlipTarget(event.target)) return;
      if (isModalBlockingFlip) return;
      if (isInkEditingActive) return;

      if (previewMode) {
        event?.stopPropagation();
        onPreviewFlip?.();
        return;
      }

      if (!onFlip) return;

      event?.stopPropagation();
      onFlip();
    },
    [
      isInkEditingActive,
      isModalBlockingFlip,
      onFlip,
      onPreviewFlip,
      previewMode,
      shouldHandleFlip,
    ],
  );

  const handleKeyDown = React.useCallback<
    React.KeyboardEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;

      event.preventDefault();
      handleFlip();
    },
    [handleFlip, isCardClickable],
  );

  const handlePointerDownCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;

      if (shouldIgnoreFlipTarget(event.target)) {
        resetPointerGesture();
        return;
      }

      pointerGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
    },
    [isCardClickable, resetPointerGesture],
  );

  const handlePointerMoveCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;

      const state = pointerGestureRef.current;
      if (state.pointerId !== event.pointerId) return;
      if (state.moved) return;

      const dx = Math.abs(event.clientX - state.startX);
      const dy = Math.abs(event.clientY - state.startY);

      if (
        dx > TAP_MOVE_CANCEL_THRESHOLD_PX ||
        dy > TAP_MOVE_CANCEL_THRESHOLD_PX
      ) {
        pointerGestureRef.current = {
          ...state,
          moved: true,
        };
      }
    },
    [isCardClickable],
  );

  const handlePointerUpCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;
      finishPointerGesture(event.pointerId);
    },
    [finishPointerGesture, isCardClickable],
  );

  const handlePointerCancelCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!isCardClickable) return;
      finishPointerGesture(event.pointerId);
    },
    [finishPointerGesture, isCardClickable],
  );

  return {
    handleFlip,
    handleKeyDown,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
  };
};
