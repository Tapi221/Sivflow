import {
  CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT,
  CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT,
} from "@constants/shared/flashcard";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { useCallback, useEffect, useRef, type RefObject } from "react";

import {
  computeNextCardSetViewZoomPercentFromGesture,
  computeNextCardSetViewZoomPercentFromWheel,
  shouldHandleCardSetViewZoomInputTarget,
} from "@/features/cardsetview/presentation/web/hooks/cardSetViewZoomInputUtils";

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
  onZoomPercentPreview: (nextZoomPercent: number) => void;
  onZoomPercentCommit: (nextZoomPercent: number) => void;
  onZoomPreviewClear?: () => void;
}

const WHEEL_COMMIT_DELAY_MS = 90;

export const useCardSetViewZoomInput = ({
  containerRef,
  enabled = true,
  zoomPercent,
  minZoomPercent,
  maxZoomPercent,
  presentationWidthPx,
  maxPresentationWidthPx,
  cardLayoutMode,
  wheelZoomStepPercent = CARD_VIEW_ZOOM_WHEEL_STEP_PERCENT,
  gestureZoomStepPercent = CARD_VIEW_ZOOM_GESTURE_STEP_PERCENT,
  onZoomPercentPreview,
  onZoomPercentCommit,
  onZoomPreviewClear,
}: UseCardSetViewZoomInputOptions) => {
  const zoomPercentRef = useRef(zoomPercent);
  const minZoomPercentRef = useRef(minZoomPercent);
  const maxZoomPercentRef = useRef(maxZoomPercent);
  const presentationWidthPxRef = useRef(presentationWidthPx);
  const maxPresentationWidthPxRef = useRef(maxPresentationWidthPx);
  const cardLayoutModeRef = useRef(cardLayoutMode);
  const wheelZoomStepPercentRef = useRef(wheelZoomStepPercent);
  const gestureZoomStepPercentRef = useRef(gestureZoomStepPercent);
  const onZoomPercentPreviewRef = useRef(onZoomPercentPreview);
  const onZoomPercentCommitRef = useRef(onZoomPercentCommit);
  const onZoomPreviewClearRef = useRef(onZoomPreviewClear);

  const previewZoomPercentRef = useRef<number | null>(null);
  const gestureStartPresentationWidthRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);

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
    onZoomPercentPreviewRef.current = onZoomPercentPreview;
  }, [onZoomPercentPreview]);

  useEffect(() => {
    onZoomPercentCommitRef.current = onZoomPercentCommit;
  }, [onZoomPercentCommit]);

  useEffect(() => {
    onZoomPreviewClearRef.current = onZoomPreviewClear;
  }, [onZoomPreviewClear]);

  const cancelScheduledCommit = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, []);

  const clearPreviewZoom = useCallback(() => {
    previewZoomPercentRef.current = null;
    onZoomPreviewClearRef.current?.();
  }, []);

  const applyPreviewZoomPercent = useCallback(
    (nextZoomPercent: number | null) => {
      if (nextZoomPercent === null || !Number.isFinite(nextZoomPercent)) {
        clearPreviewZoom();
        return;
      }

      previewZoomPercentRef.current = nextZoomPercent;
      onZoomPercentPreviewRef.current(nextZoomPercent);
    },
    [clearPreviewZoom],
  );

  const commitPreviewZoomPercent = useCallback(() => {
    cancelScheduledCommit();

    const previewZoomPercent = previewZoomPercentRef.current;
    if (previewZoomPercent === null || !Number.isFinite(previewZoomPercent)) {
      clearPreviewZoom();
      return;
    }

    if (Math.abs(previewZoomPercent - zoomPercentRef.current) < 0.0005) {
      clearPreviewZoom();
      return;
    }

    previewZoomPercentRef.current = null;
    onZoomPercentCommitRef.current(previewZoomPercent);
  }, [cancelScheduledCommit, clearPreviewZoom]);

  const scheduleCommit = useCallback(() => {
    cancelScheduledCommit();

    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      commitPreviewZoomPercent();
    }, WHEEL_COMMIT_DELAY_MS);
  }, [cancelScheduledCommit, commitPreviewZoomPercent]);

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

      const baseZoomPercent =
        previewZoomPercentRef.current ?? zoomPercentRef.current;

      const nextZoomPercent = computeNextCardSetViewZoomPercentFromWheel({
        currentZoomPercent: baseZoomPercent,
        deltaY,
        minZoomPercent: minZoomPercentRef.current,
        maxZoomPercent: maxZoomPercentRef.current,
        stepPercent: wheelZoomStepPercentRef.current,
      });

      applyPreviewZoomPercent(nextZoomPercent);
      scheduleCommit();
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
      cancelScheduledCommit();
      gestureStartPresentationWidthRef.current = presentationWidthPxRef.current;
      previewZoomPercentRef.current = zoomPercentRef.current;
    };

    const handleGestureChange = (event: Event) => {
      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);

      const gestureScale = (event as Event & { scale?: number }).scale;
      const nextZoomPercent = computeNextCardSetViewZoomPercentFromGesture({
        currentZoomPercent:
          previewZoomPercentRef.current ?? zoomPercentRef.current,
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

      applyPreviewZoomPercent(nextZoomPercent);
    };

    const handleGestureEnd = (event: Event) => {
      if (!shouldHandleTarget(event.target)) {
        return;
      }

      stopNativeEvent(event);
      gestureStartPresentationWidthRef.current = null;
      commitPreviewZoomPercent();
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

      cancelScheduledCommit();
      wheelDeltaRef.current = 0;
      previewZoomPercentRef.current = null;
      gestureStartPresentationWidthRef.current = null;
    };
  }, [
    applyPreviewZoomPercent,
    cancelScheduledCommit,
    commitPreviewZoomPercent,
    containerRef,
    enabled,
    scheduleCommit,
  ]);
};
