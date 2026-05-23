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

const PDF_ZOOM_COMMIT_IDLE_MS = 120;
const PDF_ZOOM_PREVIEW_CLEAR_FRAME_COUNT = 2;
const PDF_ZOOM_SCALE_EPSILON = 0.0005;

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
  const containerRef = useRef<HTMLDivElement | null>(container);
  const gestureScaleRef = useRef(gestureScale);
  const previewScaleRef = useRef(gestureScale);
  const minGestureScaleRef = useRef(minGestureScale);
  const maxGestureScaleRef = useRef(maxGestureScale);
  const onGestureScaleChangeRef = useRef(onGestureScaleChange);
  const gestureStartScaleRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);
  const zoomCommitTimeoutRef = useRef<number | null>(null);
  const previewClearRafIdsRef = useRef<number[]>([]);
  const previewActiveRef = useRef(false);

  const getPreviewTarget = useCallback(() => {
    const currentContainer = containerRef.current;

    if (!currentContainer) {
      return null;
    }

    const firstChild = currentContainer.firstElementChild;

    return firstChild instanceof HTMLElement ? firstChild : currentContainer;
  }, []);

  const clearPendingPreviewClear = useCallback(() => {
    previewClearRafIdsRef.current.forEach((rafId) => {
      window.cancelAnimationFrame(rafId);
    });
    previewClearRafIdsRef.current = [];
  }, []);

  const clearPendingGestureScaleCommit = useCallback(() => {
    if (zoomCommitTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(zoomCommitTimeoutRef.current);
    zoomCommitTimeoutRef.current = null;
  }, []);

  const resetPreviewStyles = useCallback(() => {
    const previewTarget = getPreviewTarget();

    if (!previewTarget) {
      return;
    }

    previewTarget.style.transform = "";
    previewTarget.style.transformOrigin = "";
    previewTarget.style.willChange = "";
  }, [getPreviewTarget]);

  const schedulePreviewClear = useCallback(() => {
    clearPendingPreviewClear();

    const requestNextFrame = (remainingFrameCount: number) => {
      const rafId = window.requestAnimationFrame(() => {
        previewClearRafIdsRef.current = previewClearRafIdsRef.current.filter(
          (currentRafId) => currentRafId !== rafId,
        );

        if (remainingFrameCount > 1) {
          requestNextFrame(remainingFrameCount - 1);
          return;
        }

        resetPreviewStyles();
        previewActiveRef.current = false;
        previewScaleRef.current = gestureScaleRef.current;
      });

      previewClearRafIdsRef.current.push(rafId);
    };

    requestNextFrame(PDF_ZOOM_PREVIEW_CLEAR_FRAME_COUNT);
  }, [clearPendingPreviewClear, resetPreviewStyles]);

  const applyPreviewScale = useCallback(
    (nextGestureScale: number) => {
      const clampedGestureScale = clampGestureScale(
        nextGestureScale,
        minGestureScaleRef.current,
        maxGestureScaleRef.current,
      );
      const baseGestureScale = gestureScaleRef.current;

      previewScaleRef.current = clampedGestureScale;
      clearPendingPreviewClear();

      if (
        !Number.isFinite(baseGestureScale) ||
        baseGestureScale <= 0 ||
        Math.abs(clampedGestureScale - baseGestureScale) <
          PDF_ZOOM_SCALE_EPSILON
      ) {
        resetPreviewStyles();
        previewActiveRef.current = false;
        return clampedGestureScale;
      }

      const previewTarget = getPreviewTarget();

      if (!previewTarget) {
        return clampedGestureScale;
      }

      previewTarget.style.transform = `scale(${clampedGestureScale / baseGestureScale})`;
      previewTarget.style.transformOrigin = "50% 0px";
      previewTarget.style.willChange = "transform";
      previewActiveRef.current = true;

      return clampedGestureScale;
    },
    [clearPendingPreviewClear, getPreviewTarget, resetPreviewStyles],
  );

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

      if (
        Math.abs(clampedGestureScale - gestureScaleRef.current) <
        PDF_ZOOM_SCALE_EPSILON
      ) {
        return;
      }

      gestureScaleRef.current = clampedGestureScale;
      handler(clampedGestureScale, source);
    },
    [],
  );

  const scheduleGestureScaleCommit = useCallback(
    (source: PdfScaleChangeSource, delayMs = PDF_ZOOM_COMMIT_IDLE_MS) => {
      clearPendingGestureScaleCommit();

      const commitGestureScale = () => {
        zoomCommitTimeoutRef.current = null;
        emitGestureScaleChange(previewScaleRef.current, source);
      };

      if (delayMs <= 0) {
        commitGestureScale();
        return;
      }

      zoomCommitTimeoutRef.current = window.setTimeout(
        commitGestureScale,
        delayMs,
      );
    },
    [clearPendingGestureScaleCommit, emitGestureScaleChange],
  );

  useEffect(() => {
    containerRef.current = container;
  }, [container]);

  useEffect(() => {
    gestureScaleRef.current = gestureScale;

    if (!previewActiveRef.current) {
      previewScaleRef.current = gestureScale;
      return;
    }

    if (
      Math.abs(gestureScale - previewScaleRef.current) < PDF_ZOOM_SCALE_EPSILON
    ) {
      schedulePreviewClear();
    }
  }, [gestureScale, schedulePreviewClear]);

  useEffect(() => {
    minGestureScaleRef.current = minGestureScale;
    maxGestureScaleRef.current = maxGestureScale;
  }, [maxGestureScale, minGestureScale]);

  useEffect(() => {
    onGestureScaleChangeRef.current = onGestureScaleChange;
  }, [onGestureScaleChange]);

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
          previewScaleRef.current *
          Math.exp(-accumulatedDelta * PDF_GESTURE_WHEEL_ZOOM_INTENSITY);

        applyPreviewScale(rawNextGestureScale);
        scheduleGestureScaleCommit("wheel");
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
      clearPendingGestureScaleCommit();
      gestureStartScaleRef.current = previewScaleRef.current;
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
        (gestureStartScaleRef.current ?? previewScaleRef.current) *
        browserGestureScale;

      applyPreviewScale(rawNextGestureScale);
      scheduleGestureScaleCommit("gesture");
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
      scheduleGestureScaleCommit("gesture", 0);
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

      clearPendingGestureScaleCommit();
      clearPendingPreviewClear();
      resetPreviewStyles();
      previewActiveRef.current = false;
      previewScaleRef.current = gestureScaleRef.current;
      wheelDeltaRef.current = 0;
      gestureStartScaleRef.current = null;
    };
  }, [
    applyPreviewScale,
    clearPendingGestureScaleCommit,
    clearPendingPreviewClear,
    container,
    resetPreviewStyles,
    scheduleGestureScaleCommit,
  ]);
};
