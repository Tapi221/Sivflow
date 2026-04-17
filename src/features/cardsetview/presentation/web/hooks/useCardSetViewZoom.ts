import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { CANONICAL_CARD_WIDTH } from "@constants/shared/cardGeometry";
import type {
  CardLayoutMode,
  CardSetInteractionMode,
  SplitFallbackCardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import { LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS } from "@/features/cardsetview/domain/cardSetViewPresentationDefaults";
import {
  clampNormalizedZoomPercent,
  resolveCanUseSplitLayout,
  resolvePresentationMaxWidthPx,
  resolvePresentationWidthPx,
  resolveUsablePresentationWidthPx,
  resolveZoomDefaultPercent,
  resolveZoomScaleFromPresentationWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import {
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_VIEW_ZOOM_STEP_PERCENT,
} from "@/features/cardsetview/constants";
import {
  buildCardSetViewZoomPreferenceScopeKey,
  getCardSetViewZoomPreference,
  setCardSetViewZoomPreference,
  type CardSetViewZoomPreferenceScope,
} from "@/services/cardSetViewZoomPreferences";
import type { CardDisplayMode } from "@/types/domain/cardSet";

interface UseCardSetViewZoomOptions {
  deviceScope: string;
  cardSetId: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  activeCardKey: string;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  requestedCardLayoutMode: CardLayoutMode;
  splitFallbackLayoutMode: SplitFallbackCardLayoutMode;
}

type ZoomPreferenceState = {
  scopeKey: string;
  preferredPercent: number | null;
};

const DEFAULT_SOURCE_KEY = "__cardsetview_zoom_default__";

export const clampZoomPercent = (value: number) =>
  clampNormalizedZoomPercent(value);
export const computeDynamicMaxZoomPercent = () => 100;

const buildZoomScope = ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
  cardLayoutMode,
}: {
  deviceScope: string;
  cardSetId: string | null;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
}): CardSetViewZoomPreferenceScope => ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
  cardLayoutMode,
});

export const useCardSetViewZoom = ({
  deviceScope,
  cardSetId,
  viewportRef,
  activeCardKey,
  displayMode,
  interactionMode,
  requestedCardLayoutMode,
  splitFallbackLayoutMode,
}: UseCardSetViewZoomOptions) => {
  const [viewportWidthPx, setViewportWidthPx] = useState<number>(
    CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  );
  const [showConstraintIndicator, setShowConstraintIndicator] = useState(false);
  const [zoomPreferenceState, setZoomPreferenceState] =
    useState<ZoomPreferenceState>({
      scopeKey: DEFAULT_SOURCE_KEY,
      preferredPercent: null,
    });

  const initialMeasurementCompleteRef = useRef(false);
  const indicatorTimeoutRef = useRef<number | null>(null);

  const triggerConstraintIndicator = useCallback(() => {
    setShowConstraintIndicator(true);

    if (typeof window === "undefined") {
      return;
    }

    if (indicatorTimeoutRef.current != null) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }

    indicatorTimeoutRef.current = window.setTimeout(() => {
      setShowConstraintIndicator(false);
      indicatorTimeoutRef.current = null;
    }, LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS);
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      const nextWidth = Math.max(1, Math.floor(node.clientWidth));

      setViewportWidthPx((prevWidthPx) => {
        if (prevWidthPx === nextWidth) {
          return prevWidthPx;
        }

        if (initialMeasurementCompleteRef.current) {
          triggerConstraintIndicator();
        } else {
          initialMeasurementCompleteRef.current = true;
        }

        return nextWidth;
      });
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
  }, [activeCardKey, triggerConstraintIndicator, viewportRef]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        indicatorTimeoutRef.current != null
      ) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  const canUseSplit = useMemo(() => {
    if (requestedCardLayoutMode !== "split") {
      return true;
    }

    return resolveCanUseSplitLayout({
      viewportWidthPx,
      interactionMode,
      displayMode,
    });
  }, [displayMode, interactionMode, requestedCardLayoutMode, viewportWidthPx]);

  const effectiveCardLayoutMode = useMemo<CardLayoutMode>(() => {
    if (requestedCardLayoutMode === "split" && !canUseSplit) {
      return splitFallbackLayoutMode;
    }

    return requestedCardLayoutMode;
  }, [canUseSplit, requestedCardLayoutMode, splitFallbackLayoutMode]);

  const zoomScope = useMemo(
    () =>
      buildZoomScope({
        deviceScope,
        cardSetId,
        displayMode,
        interactionMode,
        cardLayoutMode: effectiveCardLayoutMode,
      }),
    [
      cardSetId,
      deviceScope,
      displayMode,
      effectiveCardLayoutMode,
      interactionMode,
    ],
  );

  const zoomSourceKey = useMemo(
    () => buildCardSetViewZoomPreferenceScopeKey(zoomScope),
    [zoomScope],
  );

  const defaultZoomPercent = useMemo(
    () =>
      resolveZoomDefaultPercent({
        interactionMode,
        cardLayoutMode: effectiveCardLayoutMode,
      }),
    [effectiveCardLayoutMode, interactionMode],
  );

  const storedPreferredPercent = useMemo(() => {
    if (!cardSetId) {
      return defaultZoomPercent;
    }

    return getCardSetViewZoomPreference(zoomScope) ?? defaultZoomPercent;
  }, [cardSetId, defaultZoomPercent, zoomScope]);

  const preferredZoomPercent =
    zoomPreferenceState.scopeKey === zoomSourceKey &&
    zoomPreferenceState.preferredPercent != null
      ? zoomPreferenceState.preferredPercent
      : storedPreferredPercent;

  const zoomPercent = useMemo(
    () => clampNormalizedZoomPercent(preferredZoomPercent),
    [preferredZoomPercent],
  );

  useEffect(() => {
    if (!cardSetId) {
      return;
    }

    setCardSetViewZoomPreference(zoomScope, zoomPercent);
  }, [cardSetId, zoomPercent, zoomScope]);

  const usableWidthPx = useMemo(
    () => resolveUsablePresentationWidthPx({ viewportWidthPx }),
    [viewportWidthPx],
  );

  const maxPresentationWidthPx = useMemo(
    () =>
      resolvePresentationMaxWidthPx({
        usableWidthPx,
        displayMode,
        cardLayoutMode: effectiveCardLayoutMode,
      }),
    [displayMode, effectiveCardLayoutMode, usableWidthPx],
  );

  const presentationWidthPx = useMemo(
    () =>
      resolvePresentationWidthPx({
        zoomPercent,
        interactionMode,
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
      }),
    [
      effectiveCardLayoutMode,
      interactionMode,
      maxPresentationWidthPx,
      zoomPercent,
    ],
  );

  const zoomScale = useMemo(
    () =>
      resolveZoomScaleFromPresentationWidthPx({
        presentationWidthPx,
        canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      }),
    [presentationWidthPx],
  );

  const setZoomPercent = useCallback(
    (nextPercent: number) => {
      setZoomPreferenceState({
        scopeKey: zoomSourceKey,
        preferredPercent: clampNormalizedZoomPercent(nextPercent),
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
    setZoomPercent(defaultZoomPercent);
  }, [defaultZoomPercent, setZoomPercent]);

  return {
    zoomPercent,
    zoomScale,
    viewportWidthPx,
    availableWidthPx: usableWidthPx,
    fixedCardWidthPx: presentationWidthPx,
    minZoomPercent: 0,
    maxZoomPercent: 100,
    defaultZoomPercent,
    setZoomPercent,
    stepUp,
    stepDown,
    reset,
    canUseSplit,
    effectiveCardLayoutMode,
    showConstraintIndicator,
    presentationWidthPx,
    maxPresentationWidthPx,
  };
};
