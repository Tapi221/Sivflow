import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT, CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";
import { computeNextCardSetViewZoomPercentFromGesture, computeNextCardSetViewZoomPercentFromWheel, shouldHandleCardSetViewZoomInputTarget } from "./cardSetViewZoomInputUtils";



interface UseCardSetViewZoomInputOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  zoomPercent: number;
  minZoomPercent: number;
  maxZoomPercent: number;
  presentationWidthPx: number;
  maxPresentationWidthPx: number;
  cardLayoutMode: CardLayoutMode;
  wheelZoomStepPercent?: number;
  gestureZoomStepPercent?: number;
  onZoomPercentChange: (nextZoomPercent: number) => void;
}



const useCardSetViewZoomInput = ({ containerRef, enabled = true, zoomPercent, minZoomPercent, maxZoomPercent, presentationWidthPx, maxPresentationWidthPx, cardLayoutMode, wheelZoomStepPercent = CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT, gestureZoomStepPercent = CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT, onZoomPercentChange }: UseCardSetViewZoomInputOptions) => {
  const zoomPercentRef = useRef(zoomPercent);
  const minZoomPercentRef = useRef(minZoomPercent);
  const maxZoomPercentRef = useRef(maxZoomPercent);
  const presentationWidthPxRef = useRef(presentationWidthPx);
  const maxPresentationWidthPxRef = useRef(maxPresentationWidthPx);
  const cardLayoutModeRef = useRef(cardLayoutMode);
  const wheelZoomStepPercentRef = useRef(wheelZoomStepPercent);
  const gestureZoomStepPercentRef = useRef(gestureZoomStepPercent);
  const onZoomPercentChangeRef = useRef(onZoomPercentChange);

  const gestureStartPresentationWidthRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);

  useEffect(() => {
    zoomPercentRef.current = zoomPercent;
  }, [zoomPercent]);

  useEffect(() => {
    minZoomPercentRef.current = minZoomPercent;
    maxZoomPercentRef.current = maxZoomPercent;
  }, [maxZoomPercent, minZoomPercent]);

  useEffect(() => {
    presentationWidthPxRef.current = presentationWidthPx;
    maxPresentationWidthPxRef.current = maxPresentationWidthPx;
  }, [maxPresentationWidthPx, presentationWidthPx]);

  useEffect(() => {
    cardLayoutModeRef.current = cardLayoutMode;
  }, [cardLayoutMode]);

  useEffect(() => {
    wheelZoomStepPercentRef.current = wheelZoomStepPercent;
  }, [wheelZoomStepPercent]);

  useEffect(() => {
    gestureZoomStepPercentRef.current = gestureZoomStepPercent;
  }, [gestureZoomStepPercent]);

  useEffect(() => {
    onZoomPercentChangeRef.current = onZoomPercentChange;
  }, [onZoomPercentChange]);

  const commitZoomPercent = useCallback((nextZoomPercent: number | null) => {
    if (nextZoomPercent === null || !Number.isFinite(nextZoomPercent)) {
      return;
    }

    if (Math.abs(nextZoomPercent - zoomPercentRef.current) < 0.0005) {
      return;
    }

    zoomPercentRef.current = nextZoomPercent;
    onZoomPercentChangeRef.current(nextZoomPercent);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const shouldHandleTarget = (target: EventTarget | null) =>
      shouldHandleCardSetViewZoomInputTarget({
        container,
        target,
      });

    const stopNativeEvent = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }

      event.stopPropagation();
      (
        event as Event & {
          stopImmediatePropagation?: () => void;
        }
      ).stopImmediatePropagation?.();
    };

    const flushWheelZoom = () => {
      const deltaY = wheelDeltaRef.current;
      wheelDeltaRef.current = 0;
      wheelZoomRafRef.current = null;

      const nextZoomPercent = computeNextCardSetViewZoomPercentFromWheel({
        currentZoomPercent: zoomPercentRef.current,
        deltaY,
        minZoomPercent: minZoomPercentRef.current,
        maxZoomPercent: maxZoomPercentRef.current,
        stepPercent: wheelZoomStepPercentRef.current,
      });

      commitZoomPercent(nextZoomPercent);
    };

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);

      if (gestureStartPresentationWidthRef.current !== null) {
        return;
      }

      wheelDeltaRef.current += event.deltaY;

      if (wheelZoomRafRef.current !== null) {
        return;
      }

      wheelZoomRafRef.current = window.requestAnimationFrame(flushWheelZoom);
    };

    const handleGestureStart = (event: Event) => {
      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);
      gestureStartPresentationWidthRef.current = presentationWidthPxRef.current;
    };

    const handleGestureChange = (event: Event) => {
      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);

      const gestureScale = (event as Event & { scale?: number; }).scale;
      const nextZoomPercent = computeNextCardSetViewZoomPercentFromGesture({
        currentZoomPercent: zoomPercentRef.current,
        basePresentationWidthPx:
          gestureStartPresentationWidthRef.current ??
          presentationWidthPxRef.current,
        gestureScale:
          typeof gestureScale === "number" ? gestureScale : Number.NaN,
        cardLayoutMode: cardLayoutModeRef.current,
        maxPresentationWidthPx: maxPresentationWidthPxRef.current,
        minZoomPercent: minZoomPercentRef.current,
        maxZoomPercent: maxZoomPercentRef.current,
        stepPercent: gestureZoomStepPercentRef.current,
      });

      commitZoomPercent(nextZoomPercent);
    };

    const handleGestureEnd = (event: Event) => {
      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);
      gestureStartPresentationWidthRef.current = null;
    };

    const listenerOptions: AddEventListenerOptions = {
      passive: false,
      capture: true,
    };
    const supportsGestureEvents = "ongesturestart" in window;

    container.addEventListener("wheel", handleWheel, listenerOptions);

    if (supportsGestureEvents) {
      container.addEventListener(
        "gesturestart",
        handleGestureStart,
        listenerOptions,
      );
      container.addEventListener(
        "gesturechange",
        handleGestureChange,
        listenerOptions,
      );
      container.addEventListener(
        "gestureend",
        handleGestureEnd,
        listenerOptions,
      );
    }

    return () => {
      container.removeEventListener("wheel", handleWheel, true);

      if (supportsGestureEvents) {
        container.removeEventListener("gesturestart", handleGestureStart, true);
        container.removeEventListener(
          "gesturechange",
          handleGestureChange,
          true,
        );
        container.removeEventListener("gestureend", handleGestureEnd, true);
      }

      if (wheelZoomRafRef.current !== null) {
        window.cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }

      wheelDeltaRef.current = 0;
      gestureStartPresentationWidthRef.current = null;
    };
  }, [commitZoomPercent, containerRef, enabled]);
};



export { useCardSetViewZoomInput };
