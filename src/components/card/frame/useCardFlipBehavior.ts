import React from "react";



type PointerGestureState = Readonly<{
  pointerId: number | null;
  startX: number;
  startY: number;
  moved: boolean;
}>;
type FlipTriggerEvent = Readonly<{
  target: EventTarget | null;
  stopPropagation?: () => void;
}>;
type UseCardFlipBehaviorParams = Readonly<{ isCardClickable: boolean;
  previewMode: boolean;
  onFlip?: () => void;
  onPreviewFlip?: () => void;
  isModalBlockingFlip: boolean;
  isInkEditingActive: boolean;
}>;
type UseCardFlipBehaviorResult = Readonly<{ handleFlip: (event?: React.MouseEvent<HTMLDivElement>) => void;
  handleKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  handlePointerDownCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerMoveCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerUpCapture: React.PointerEventHandler<HTMLDivElement>;
  handlePointerCancelCapture: React.PointerEventHandler<HTMLDivElement>;
}>;



const TAP_MOVE_CANCEL_THRESHOLD_PX = 8;



const shouldIgnoreFlipTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return Boolean(
    element.closest(
      "button, a, input, textarea, select, label, [data-card-no-flip=\"true\"]",
    ),
  );
};
const createInitialPointerGestureState = (): PointerGestureState => ({
  pointerId: null,
  startX: 0,
  startY: 0,
  moved: false,
});
const useCardFlipBehavior = ({ isCardClickable, previewMode, onFlip, onPreviewFlip, isModalBlockingFlip, isInkEditingActive }: UseCardFlipBehaviorParams): UseCardFlipBehaviorResult => {
  const suppressNextFlipRef = React.useRef(false);
  const pointerGestureRef = React.useRef<PointerGestureState>(
    createInitialPointerGestureState(),
  );

  const shouldHandleFlip = previewMode || (isCardClickable && Boolean(onFlip));

  const resetPointerGesture = React.useCallback(() => {
    pointerGestureRef.current = createInitialPointerGestureState();
  }, []);

  const invokeFlip = React.useCallback(
    (event?: FlipTriggerEvent): boolean => {
      if (!shouldHandleFlip) return false;
      if (event && shouldIgnoreFlipTarget(event.target)) return false;
      if (isModalBlockingFlip) return false;
      if (isInkEditingActive) return false;

      event?.stopPropagation?.();

      if (previewMode) {
        onPreviewFlip?.();
        return true;
      }

      if (!onFlip) return false;

      onFlip();
      return true;
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

  const handleFlip = React.useCallback(
    (event?: React.MouseEvent<HTMLDivElement>) => {
      if (!shouldHandleFlip) return;

      if (suppressNextFlipRef.current) {
        suppressNextFlipRef.current = false;
        return;
      }

      void invokeFlip(event);
    },
    [invokeFlip, shouldHandleFlip],
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
      if (!shouldHandleFlip) return;

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
    [resetPointerGesture, shouldHandleFlip],
  );

  const handlePointerMoveCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!shouldHandleFlip) return;

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
    [shouldHandleFlip],
  );

  const handlePointerUpCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (event) => {
      if (!shouldHandleFlip) return;

      const state = pointerGestureRef.current;
      if (state.pointerId !== event.pointerId) return;

      const canFlipFromPointer =
        !state.moved &&
        !shouldIgnoreFlipTarget(event.target) &&
        !isModalBlockingFlip &&
        !isInkEditingActive;

      resetPointerGesture();

      if (!canFlipFromPointer) {
        if (state.moved) {
          suppressNextFlipRef.current = true;
        }
        return;
      }

      suppressNextFlipRef.current = true;
      void invokeFlip(event);
    },
    [
      invokeFlip,
      isInkEditingActive,
      isModalBlockingFlip,
      resetPointerGesture,
      shouldHandleFlip,
    ],
  );

  const handlePointerCancelCapture = React.useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(() => {
    resetPointerGesture();
  }, [resetPointerGesture]);

  return {
    handleFlip,
    handleKeyDown,
    handlePointerDownCapture,
    handlePointerMoveCapture,
    handlePointerUpCapture,
    handlePointerCancelCapture,
  };
};



export { TAP_MOVE_CANCEL_THRESHOLD_PX, shouldIgnoreFlipTarget, useCardFlipBehavior };


export type { UseCardFlipBehaviorParams, UseCardFlipBehaviorResult };
