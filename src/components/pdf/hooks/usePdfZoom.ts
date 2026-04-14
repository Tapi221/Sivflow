import { useCallback, useEffect, useRef } from "react";
import type { PdfScaleChangeSource } from "@/components/pdf/pdfViewerTypes";
import {
  computeNextScaleFromGesture,
  computeNextScaleFromWheel,
} from "@/components/pdf/pdfZoomUtils";

interface UsePdfZoomOptions {
  container: HTMLDivElement | null;
  previewTarget: HTMLDivElement | null;
  scale: number;
  minScale: number;
  maxScale: number;
  zoomStep: number;
  onScaleChange?: (nextScale: number, source: PdfScaleChangeSource) => void;
}

const WHEEL_COMMIT_DELAY_MS = 90;

export const usePdfZoom = ({
  container,
  previewTarget,
  scale,
  minScale,
  maxScale,
  zoomStep,
  onScaleChange,
}: UsePdfZoomOptions) => {
  const scaleRef = useRef(scale);
  const minScaleRef = useRef(minScale);
  const maxScaleRef = useRef(maxScale);
  const zoomStepRef = useRef(zoomStep);
  const onScaleChangeRef = useRef(onScaleChange);
  const gestureStartScaleRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelZoomRafRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const previewScaleRef = useRef<number | null>(null);
  const awaitingCommittedScaleRef = useRef(false);

  useEffect(() => {
    scaleRef.current = scale;

    const previewScale = previewScaleRef.current;
    if (previewScale === null) {
      return;
    }

    if (awaitingCommittedScaleRef.current) {
      if (Math.abs(previewScale - scale) < 0.0005) {
        if (previewTarget) {
          previewTarget.style.transform = "";
          previewTarget.style.transformOrigin = "";
          previewTarget.style.willChange = "";
        }
        previewScaleRef.current = null;
        awaitingCommittedScaleRef.current = false;
        return;
      }

      if (previewTarget && Number.isFinite(scale) && scale > 0) {
        const ratio = previewScale / scale;
        previewTarget.style.transformOrigin = "top center";
        previewTarget.style.transform = `scale(${ratio})`;
        previewTarget.style.willChange = "transform";
      }
      return;
    }

    if (previewTarget) {
      previewTarget.style.transform = "";
      previewTarget.style.transformOrigin = "";
      previewTarget.style.willChange = "";
    }
    previewScaleRef.current = null;
  }, [previewTarget, scale]);

  useEffect(() => {
    minScaleRef.current = minScale;
    maxScaleRef.current = maxScale;
  }, [minScale, maxScale]);

  useEffect(() => {
    zoomStepRef.current = zoomStep;
  }, [zoomStep]);

  useEffect(() => {
    onScaleChangeRef.current = onScaleChange;
  }, [onScaleChange]);

  const clearPreviewTransform = useCallback(() => {
    if (previewTarget) {
      previewTarget.style.transform = "";
      previewTarget.style.transformOrigin = "";
      previewTarget.style.willChange = "";
    }

    previewScaleRef.current = null;
    awaitingCommittedScaleRef.current = false;
  }, [previewTarget]);

  const cancelScheduledCommit = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, []);

  const applyPreviewScale = useCallback(
    (nextScale: number | null) => {
      if (nextScale === null || !Number.isFinite(nextScale)) {
        clearPreviewTransform();
        return;
      }

      previewScaleRef.current = nextScale;

      if (
        !previewTarget ||
        !Number.isFinite(scaleRef.current) ||
        scaleRef.current <= 0
      ) {
        return;
      }

      const ratio = nextScale / scaleRef.current;
      if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 0.0005) {
        if (!awaitingCommittedScaleRef.current) {
          clearPreviewTransform();
        }
        return;
      }

      previewTarget.style.transformOrigin = "top center";
      previewTarget.style.transform = `scale(${ratio})`;
      previewTarget.style.willChange = "transform";
    },
    [clearPreviewTransform, previewTarget],
  );

  const commitPreviewScale = useCallback(
    (sourceType: PdfScaleChangeSource) => {
      cancelScheduledCommit();

      const handler = onScaleChangeRef.current;
      const previewScale = previewScaleRef.current;

      if (!handler || previewScale === null || !Number.isFinite(previewScale)) {
        clearPreviewTransform();
        return;
      }

      awaitingCommittedScaleRef.current = true;
      handler(previewScale, sourceType);
    },
    [cancelScheduledCommit, clearPreviewTransform],
  );

  const scheduleCommit = useCallback(
    (sourceType: PdfScaleChangeSource) => {
      cancelScheduledCommit();

      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null;
        commitPreviewScale(sourceType);
      }, WHEEL_COMMIT_DELAY_MS);
    },
    [cancelScheduledCommit, commitPreviewScale],
  );

  useEffect(() => {
    if (!container) return;

    const logZoomInput = (payload: {
      source: PdfScaleChangeSource;
      deltaY: number | null;
      direction: number;
      nextScale: number;
      preview: boolean;
    }) => {
      if (!import.meta.env.DEV) return;
      console.debug("[PdfViewer] zoom input", payload);
    };

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

    const handleWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      stopNativeEvent(event);

      if (gestureStartScaleRef.current !== null) return;

      wheelDeltaRef.current += event.deltaY;

      if (wheelZoomRafRef.current !== null) return;

      wheelZoomRafRef.current = window.requestAnimationFrame(() => {
        wheelZoomRafRef.current = null;

        const delta = wheelDeltaRef.current;
        wheelDeltaRef.current = 0;

        const baseScale = previewScaleRef.current ?? scaleRef.current;
        const normalizedNextScale = computeNextScaleFromWheel({
          currentScale: baseScale,
          deltaY: delta,
          zoomStep: zoomStepRef.current,
          minScale: minScaleRef.current,
          maxScale: maxScaleRef.current,
        });

        if (normalizedNextScale === null) return;

        logZoomInput({
          source: "wheel",
          deltaY: delta,
          direction: Math.sign(delta),
          nextScale: normalizedNextScale,
          preview: true,
        });

        applyPreviewScale(normalizedNextScale);
        scheduleCommit("wheel");
      });
    };

    const handleGestureStart = (event: Event) => {
      stopNativeEvent(event);
      cancelScheduledCommit();
      gestureStartScaleRef.current = scaleRef.current;
      previewScaleRef.current = scaleRef.current;
    };

    const handleGestureChange = (event: Event) => {
      stopNativeEvent(event);

      const gestureScale = (event as Event & { scale?: number }).scale;
      if (typeof gestureScale !== "number" || !Number.isFinite(gestureScale)) {
        return;
      }

      const normalizedNextScale = computeNextScaleFromGesture({
        currentScale: previewScaleRef.current ?? scaleRef.current,
        baseScale: gestureStartScaleRef.current ?? scaleRef.current,
        gestureScale,
        minScale: minScaleRef.current,
        maxScale: maxScaleRef.current,
      });

      if (normalizedNextScale === null) return;

      logZoomInput({
        source: "gesture",
        deltaY: null,
        direction: Math.sign(normalizedNextScale - scaleRef.current),
        nextScale: normalizedNextScale,
        preview: true,
      });

      applyPreviewScale(normalizedNextScale);
    };

    const handleGestureEnd = (event: Event) => {
      stopNativeEvent(event);
      gestureStartScaleRef.current = null;

      const previewScale = previewScaleRef.current;
      if (
        previewScale !== null &&
        Number.isFinite(previewScale) &&
        Math.abs(previewScale - scaleRef.current) >= 0.0005
      ) {
        commitPreviewScale("gesture");
        return;
      }

      clearPreviewTransform();
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
        cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }

      cancelScheduledCommit();
      wheelDeltaRef.current = 0;
      gestureStartScaleRef.current = null;
      clearPreviewTransform();
    };
  }, [
    applyPreviewScale,
    cancelScheduledCommit,
    clearPreviewTransform,
    commitPreviewScale,
    container,
    scheduleCommit,
  ]);
};
