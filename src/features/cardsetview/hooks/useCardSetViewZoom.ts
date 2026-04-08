import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";

import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import {
  clampZoomPercent,
  computeDynamicMaxZoomPercent,
  resolveAvailableWidthPx,
  resolveFixedCardWidthPx,
  resolveZoomBounds,
  resolveZoomScale,
} from "@/features/cardsetview/domain/cardSetViewZoom";
import {
  getCardSetViewZoomPreference,
  setCardSetViewZoomPreference,
} from "@/services/cardSetViewZoomPreferences";
import {
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_VIEW_ZOOM_DEFAULT_PERCENT,
  CARD_VIEW_ZOOM_MIN_PERCENT,
  CARD_VIEW_ZOOM_STEP_PERCENT,
} from "@/routes/constants";

interface UseCardSetViewZoomOptions {
  cardSetId: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  activeCardKey: string;
}

type ZoomPreferenceState = {
  sourceKey: string;
  preferredPercent: number | null;
};

const DEFAULT_SOURCE_KEY = "__cardsetview_default__";

export { clampZoomPercent, computeDynamicMaxZoomPercent };

export const useCardSetViewZoom = ({
  cardSetId,
  viewportRef,
  activeCardKey,
}: UseCardSetViewZoomOptions) => {
  const [viewportWidthPx, setViewportWidthPx] = useState<number>(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );

  const [zoomPreferenceState, setZoomPreferenceState] =
    useState<ZoomPreferenceState>({
      sourceKey: DEFAULT_SOURCE_KEY,
      preferredPercent: null,
    });

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      const nextWidth = Math.max(1, Math.floor(node.clientWidth));
      setViewportWidthPx((prev: number) =>
        prev === nextWidth ? prev : nextWidth,
      );
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

  const zoomBounds = useMemo(() => {
    return resolveZoomBounds({
      viewportWidthPx,
      canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      minPercent: CARD_VIEW_ZOOM_MIN_PERCENT,
      defaultPercent: CARD_VIEW_ZOOM_DEFAULT_PERCENT,
      stepPercent: CARD_VIEW_ZOOM_STEP_PERCENT,
    });
  }, [viewportWidthPx]);

  const zoomSourceKey = cardSetId ?? DEFAULT_SOURCE_KEY;

  const storedPreferredPercent = useMemo(() => {
    if (!cardSetId) {
      return CARD_VIEW_ZOOM_DEFAULT_PERCENT;
    }

    return (
      getCardSetViewZoomPreference(cardSetId) ?? CARD_VIEW_ZOOM_DEFAULT_PERCENT
    );
  }, [cardSetId]);

  const preferredZoomPercent =
    zoomPreferenceState.sourceKey === zoomSourceKey &&
    zoomPreferenceState.preferredPercent != null
      ? zoomPreferenceState.preferredPercent
      : storedPreferredPercent;

  const zoomPercent = useMemo(() => {
    return clampZoomPercent(preferredZoomPercent, {
      minPercent: zoomBounds.minZoomPercent,
      maxPercent: zoomBounds.maxZoomPercent,
      stepPercent: CARD_VIEW_ZOOM_STEP_PERCENT,
    });
  }, [
    preferredZoomPercent,
    zoomBounds.minZoomPercent,
    zoomBounds.maxZoomPercent,
  ]);

  useEffect(() => {
    if (!cardSetId) {
      return;
    }

    setCardSetViewZoomPreference(cardSetId, preferredZoomPercent);
  }, [cardSetId, preferredZoomPercent]);

  const setZoomPercent = useCallback(
    (next: number) => {
      setZoomPreferenceState({
        sourceKey: zoomSourceKey,
        preferredPercent: next,
      });
    },
    [zoomSourceKey],
  );

  const stepUp = useCallback(() => {
    setZoomPercent(zoomPercent + CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

  const stepDown = useCallback(() => {
    setZoomPercent(zoomPercent - CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

  const reset = useCallback(() => {
    setZoomPercent(zoomBounds.defaultZoomPercent);
  }, [setZoomPercent, zoomBounds.defaultZoomPercent]);

  const zoomScale = resolveZoomScale(zoomPercent);
  const fixedCardWidthPx = resolveFixedCardWidthPx({
    canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
    zoomPercent,
  });
  const availableWidthPx = resolveAvailableWidthPx(viewportWidthPx);

  return {
    zoomPercent,
    zoomScale,
    viewportWidthPx,
    availableWidthPx,
    fixedCardWidthPx,
    minZoomPercent: zoomBounds.minZoomPercent,
    maxZoomPercent: zoomBounds.maxZoomPercent,
    defaultZoomPercent: zoomBounds.defaultZoomPercent,
    setZoomPercent,
    stepUp,
    stepDown,
    reset,
  };
};