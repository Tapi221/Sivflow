import { useCallback, useEffect, useRef } from "react";

import { PDF_GESTURE_WHEEL_ZOOM_INTENSITY } from "@/features/pdf";
import type { PdfScaleChangeSource } from "@/features/pdf/pdfViewer.types";

import {
  DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR,
  shouldHandleZoomInputTarget,
} from "@/shared/zoom/zoomInputTarget";

interface UsePdfZoomOptions {
  container: HTMLDivElement | null;
  gestureScale: number;
  minGestureScale: number;
  maxGestureScale: number;
  onGestureScaleChange?: (
    nextGestureScale: number,
    source: PdfScaleChangeSource,
  ) => void;
}

const PDF_ZOOM_INPUT_IGNORE_SELECTOR = [
  DEFAULT_ZOOM_INPUT_IGNORE_SELECTOR,
  "[data-pdf-zoom-input-ignore='true']",
].join(",");

const clampGestureScale = (
  value: number,
  minGestureScale: number,
  maxGestureScale: number,
) => {
  const lowerBound = Math.min(minGestureScale, maxGestureScale);
  const upperBound = Math.max(minGestureScale, maxGestureScale);

  if (!Number.isFinite(value) || value <= 0) {
    return Number(lowerBound.toFixed(3));
  }

  return Number(Math.min(Math.max(value, lowerBound), upperBound).toFixed(3));
};

export const usePdfZoom = ({
  container,
  gestureScale,
  minGestureScale,
  maxGestureScale,
  onGestureScaleChange,
}: UsePdfZoomOptions) => {
  const gestureScaleRef = useRef(gestureScale);
  const minGestureScaleRef = useRef(minGestureScale);
  const maxGestureScaleRef = useRef(maxGestureScale);
  const onGestureScaleChangeRef = useRef(onGestureScaleChange);
  const gestureStartScaleRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);

  useEffect(() => {
    gestureScaleRef.current = gestureScale;
  }, [gestureScale]);

  useEffect(() => {
    minGestureScaleRef.current = minGestureScale;
    maxGestureScaleRef.current = maxGestureScale;
  }, [maxGestureScale, minGestureScale]);

  useEffect(() => {
    onGestureScaleChangeRef.current = onGestureScaleChange;
  }, [onGestureScaleChange]);

  const emitGestureScaleChange = useCallback(
    (nextGestureScale: number, source: PdfScaleChangeSource) => {
      const handler = onGestureScaleChangeRef.current;

      if (!handler) {
        return;
      }

      const clampedGestureScale = clampGestureScale(
        nextGestureScale,
        minGestureScaleRef.current,
        maxGestureScaleRef.current,
      );

      if (Math.abs(clampedGestureScale - gestureScaleRef.current) < 0.0005) {
        return;
      }

      gestureScaleRef.current = clampedGestureScale;
      handler(clampedGestureScale, source);
    },
    [],
  );

  useEffect(() => {
    if (!container) {
      return;
    }

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

    const shouldHandleTarget = (target: EventTarget | null) => {
      return shouldHandleZoomInputTarget({
        container,
        target,
        ignoreSelector: PDF_ZOOM_INPUT_IGNORE_SELECTOR,
      });
    };

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (
        !onGestureScaleChangeRef.current ||
        !shouldHandleTarget(event.target)
      ) {
        return;
      }

      stopNativeEvent(event);
      wheelDeltaRef.current += event.deltaY;

      if (wheelZoomRafRef.current !== null) {
        return;
      }

      wheelZoomRafRef.current = window.requestAnimationFrame(() => {
        wheelZoomRafRef.current = null;

        const accumulatedDelta = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;

        if (!Number.isFinite(accumulatedDelta) || accumulatedDelta === 0) {
          return;
        }

        const rawNextGestureScale =
          gestureScaleRef.current *
          Math.exp(-accumulatedDelta * PDF_GESTURE_WHEEL_ZOOM_INTENSITY);

        emitGestureScaleChange(rawNextGestureScale, "wheel");
      });
    };

    const handleGestureStart = (event: Event) => {
      if (
        !onGestureScaleChangeRef.current ||
        !shouldHandleTarget(event.target)
      ) {
        return;
      }

      stopNativeEvent(event);
      gestureStartScaleRef.current = gestureScaleRef.current;
    };

    const handleGestureChange = (event: Event) => {
      if (
        !onGestureScaleChangeRef.current ||
        !shouldHandleTarget(event.target)
      ) {
        return;
      }

      stopNativeEvent(event);

      const browserGestureScale = (event as Event & { scale?: unknown }).scale;

      if (
        typeof browserGestureScale !== "number" ||
        !Number.isFinite(browserGestureScale) ||
        browserGestureScale <= 0
      ) {
        return;
      }

      const rawNextGestureScale =
        (gestureStartScaleRef.current ?? gestureScaleRef.current) *
        browserGestureScale;

      emitGestureScaleChange(rawNextGestureScale, "gesture");
    };

    const handleGestureEnd = (event: Event) => {
      if (
        !onGestureScaleChangeRef.current ||
        !shouldHandleTarget(event.target)
      ) {
        return;
      }

      stopNativeEvent(event);
      gestureStartScaleRef.current = null;
    };

    const supportsGestureEvents = "ongesturestart" in window;

    container.addEventListener("wheel", handleWheel, { passive: false });

    if (supportsGestureEvents) {
      container.addEventListener("gesturestart", handleGestureStart, {
        passive: false,
      });
      container.addEventListener("gesturechange", handleGestureChange, {
        passive: false,
      });
      container.addEventListener("gestureend", handleGestureEnd, {
        passive: false,
      });
    }

    return () => {
      container.removeEventListener("wheel", handleWheel);

      if (supportsGestureEvents) {
        container.removeEventListener("gesturestart", handleGestureStart);
        container.removeEventListener("gesturechange", handleGestureChange);
        container.removeEventListener("gestureend", handleGestureEnd);
      }

      if (wheelZoomRafRef.current !== null) {
        window.cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }

      wheelDeltaRef.current = 0;
      gestureStartScaleRef.current = null;
    };
  }, [container, emitGestureScaleChange]);
};
