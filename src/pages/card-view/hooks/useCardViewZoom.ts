import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import {
  getCardSetViewZoomPreference,
  setCardSetViewZoomPreference,
} from "@/services/cardViewZoomPreferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_VIEW_ZOOM_DEFAULT_PERCENT,
  CARD_VIEW_ZOOM_MIN_PERCENT,
  CARD_VIEW_ZOOM_STEP_PERCENT,
} from "../constants";

interface UseCardViewZoomOptions {
  cardSetId: string | null;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  activeCardKey: string;
}

interface ClampZoomPercentOptions {
  minPercent: number;
  maxPercent: number;
  stepPercent?: number;
}

const roundToStep = (value: number, stepPercent: number) => {
  return Math.round(value / stepPercent) * stepPercent;
};

export const computeDynamicMaxZoomPercent = (
  availableWidthPx: number,
  stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
) => {
  if (!Number.isFinite(availableWidthPx) || availableWidthPx <= 0) {
    return CARD_VIEW_ZOOM_DEFAULT_PERCENT;
  }

  const rawPercent = (availableWidthPx / CANONICAL_CARD_WIDTH) * 100;
  const snapped = Math.floor(rawPercent / stepPercent) * stepPercent;

  return Math.max(stepPercent, snapped);
};

export const clampZoomPercent = (
  value: number,
  {
    minPercent,
    maxPercent,
    stepPercent = CARD_VIEW_ZOOM_STEP_PERCENT,
  }: ClampZoomPercentOptions,
) => {
  const resolvedMax = Math.max(stepPercent, maxPercent);
  const resolvedMin = Math.min(minPercent, resolvedMax);
  const safeValue = Number.isFinite(value) ? value : resolvedMin;
  const snapped = roundToStep(safeValue, stepPercent);

  return Math.min(resolvedMax, Math.max(resolvedMin, snapped));
};

export const useCardViewZoom = ({
  cardSetId,
  viewportRef,
  activeCardKey,
}: UseCardViewZoomOptions) => {
  const [availableWidthPx, setAvailableWidthPx] = useState(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [zoomPercent, setZoomPercentState] = useState(
    CARD_VIEW_ZOOM_DEFAULT_PERCENT,
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      const nextWidth = Math.max(1, Math.floor(node.clientWidth));
      setAvailableWidthPx((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update, { passive: true });
      return () => {
        window.removeEventListener("resize", update);
      };
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeCardKey, viewportRef]);

  const dynamicMaxZoomPercent = useMemo(
    () => computeDynamicMaxZoomPercent(availableWidthPx),
    [availableWidthPx],
  );

  const effectiveMinZoomPercent = useMemo(
    () => Math.min(CARD_VIEW_ZOOM_MIN_PERCENT, dynamicMaxZoomPercent),
    [dynamicMaxZoomPercent],
  );

  const defaultZoomPercent = useMemo(
    () =>
      clampZoomPercent(CARD_VIEW_ZOOM_DEFAULT_PERCENT, {
        minPercent: effectiveMinZoomPercent,
        maxPercent: dynamicMaxZoomPercent,
      }),
    [dynamicMaxZoomPercent, effectiveMinZoomPercent],
  );

  useEffect(() => {
    const stored = cardSetId
      ? getCardSetViewZoomPreference(cardSetId)
      : undefined;

    setZoomPercentState(
      clampZoomPercent(stored ?? CARD_VIEW_ZOOM_DEFAULT_PERCENT, {
        minPercent: effectiveMinZoomPercent,
        maxPercent: dynamicMaxZoomPercent,
      }),
    );
  }, [cardSetId, dynamicMaxZoomPercent, effectiveMinZoomPercent]);

  useEffect(() => {
    setZoomPercentState((prev) =>
      clampZoomPercent(prev, {
        minPercent: effectiveMinZoomPercent,
        maxPercent: dynamicMaxZoomPercent,
      }),
    );
  }, [dynamicMaxZoomPercent, effectiveMinZoomPercent]);

  useEffect(() => {
    if (!cardSetId) {
      return;
    }

    setCardSetViewZoomPreference(cardSetId, zoomPercent);
  }, [cardSetId, zoomPercent]);

  const setZoomPercent = useCallback(
    (next: number) => {
      setZoomPercentState(
        clampZoomPercent(next, {
          minPercent: effectiveMinZoomPercent,
          maxPercent: dynamicMaxZoomPercent,
        }),
      );
    },
    [dynamicMaxZoomPercent, effectiveMinZoomPercent],
  );

  const stepUp = useCallback(() => {
    setZoomPercent(zoomPercent + CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

  const stepDown = useCallback(() => {
    setZoomPercent(zoomPercent - CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

  const reset = useCallback(() => {
    setZoomPercent(defaultZoomPercent);
  }, [defaultZoomPercent, setZoomPercent]);

  const zoomScale = zoomPercent / 100;
  const fixedCardWidthPx = Math.max(
    1,
    Math.round(CANONICAL_CARD_WIDTH * zoomScale),
  );

  return {
    zoomPercent,
    zoomScale,
    availableWidthPx,
    fixedCardWidthPx,
    minZoomPercent: effectiveMinZoomPercent,
    maxZoomPercent: dynamicMaxZoomPercent,
    defaultZoomPercent,
    setZoomPercent,
    stepUp,
    stepDown,
    reset,
  };
};