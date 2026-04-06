import { useCallback, useEffect, useRef } from "react";
import type { PdfScaleChangeSource } from "../pdfViewerTypes";
import {
  clampScale,
  computeNextScaleFromGesture,
  computeNextScaleFromWheel,
  normalizeScale,
} from "../pdfZoomUtils";

interface UsePdfZoomOptions {
  container: HTMLDivElement | null;
  scale: number;
  minScale: number;
  maxScale: number;
  zoomStep: number;
  onScaleChange?: (nextScale: number, source: PdfScaleChangeSource) => void;
}

export const usePdfZoom = ({
  container,
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

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

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

  const requestScaleChange = useCallback(
    (nextScale: number, sourceType: PdfScaleChangeSource) => {
      const handler = onScaleChangeRef.current;
      if (!handler || !Number.isFinite(nextScale)) return;

      const clamped = normalizeScale(
        clampScale(nextScale, minScaleRef.current, maxScaleRef.current),
      );

      if (!Number.isFinite(clamped)) return;
      if (Math.abs(clamped - scaleRef.current) < 0.0005) return;

      handler(clamped, sourceType);
    },
    [],
  );

  useEffect(() => {
    if (!container) return;

    const logZoomInput = (payload: {
      source: PdfScaleChangeSource;
      deltaY: number | null;
      direction: number;
      nextScale: number;
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

        const normalizedNextScale = computeNextScaleFromWheel({
          currentScale: scaleRef.current,
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
        });

        requestScaleChange(normalizedNextScale, "wheel");
      });
    };

    const handleGestureStart = (event: Event) => {
      stopNativeEvent(event);
      gestureStartScaleRef.current = scaleRef.current;
    };

    const handleGestureChange = (event: Event) => {
      stopNativeEvent(event);

      const gestureScale = (event as Event & { scale?: number }).scale;
      if (typeof gestureScale !== "number" || !Number.isFinite(gestureScale)) {
        return;
      }

      const normalizedNextScale = computeNextScaleFromGesture({
        currentScale: scaleRef.current,
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
      });

      requestScaleChange(normalizedNextScale, "gesture");
    };

    const handleGestureEnd = (event: Event) => {
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
        cancelAnimationFrame(wheelZoomRafRef.current);
        wheelZoomRafRef.current = null;
      }

      wheelDeltaRef.current = 0;
      gestureStartScaleRef.current = null;
    };
  }, [container, requestScaleChange]);
};
