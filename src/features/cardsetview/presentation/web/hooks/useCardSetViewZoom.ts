import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { CARD_PANE_VIEW_DEFAULT_WIDTH_PX } from "@/components/card/frame/cardPane.constants";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import type { CardLayoutMode, CardSetInteractionMode, SplitFallbackCardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";
import { CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS } from "@/features/cardsetview/domain/cardSetViewPresentation.constants";
import { clampZoomPercent as clampZoomPercentRange, resolveCanUseSplitLayout, resolvePresentationMaxWidthPx, resolvePresentationWidthPx, resolveUsablePresentationWidthPx, resolveZoomDefaultPercent, resolveZoomScaleFromPresentationWidthPx } from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import type { CardSetViewZoomPreferenceScope } from "@/services/cardSetViewZoomPreferences";
import { buildCardSetViewZoomPreferenceScopeKey, getCardSetViewZoomPreference, setCardSetViewZoomPreference } from "@/services/cardSetViewZoomPreferences";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface UseCardSetViewZoomOptions {
  deviceScope: string;
  cardSetId: string | null;
  viewportRef: RefObject<HTMLDivElement | null>;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  requestedCardLayoutMode: CardLayoutMode;
  splitFallbackLayoutMode: SplitFallbackCardLayoutMode;
}
type ZoomPreferenceState = {
  scopeKey: string;
  preferredPercent: number | null;
};
type LegacyZoomMigrationHint = Pick<
  CardSetViewZoomPreferenceScope,
  "displayMode" | "interactionMode" | "cardLayoutMode"
>;



const DEFAULT_SOURCE_KEY = "__cardsetview_zoom_default__";



const clampZoomPercent = (value: number) => clampZoomPercentRange(value);
const computeDynamicMaxZoomPercent = () => 100;
const buildCurrentZoomScope = ({
  deviceScope,
  cardSetId,
}: {
  deviceScope: string;
  cardSetId: string | null;
}): CardSetViewZoomPreferenceScope => ({
  deviceScope,
  cardSetId,
});
const buildLegacyZoomMigrationHint = ({
  displayMode,
  interactionMode,
  cardLayoutMode,
}: {
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
  cardLayoutMode: CardLayoutMode;
}): LegacyZoomMigrationHint => ({
  displayMode,
  interactionMode,
  cardLayoutMode,
});
const useCardSetViewZoom = ({ deviceScope, cardSetId, viewportRef, displayMode, interactionMode, requestedCardLayoutMode, splitFallbackLayoutMode }: UseCardSetViewZoomOptions) => {
  const [viewportWidthPx, setViewportWidthPx] = useState<number>(CARD_PANE_VIEW_DEFAULT_WIDTH_PX);
  const [showConstraintIndicator, setShowConstraintIndicator] =
    useState<boolean>(false);
  const [zoomPreferenceState, setZoomPreferenceState] =
    useState<ZoomPreferenceState>({
      scopeKey: DEFAULT_SOURCE_KEY,
      preferredPercent: null,
    });

  const initialMeasurementCompleteRef = useRef<boolean>(false);
  const indicatorTimeoutRef = useRef<number | null>(null);
  const isMobileDeviceScope = deviceScope === "mobile";

  const triggerConstraintIndicator = useCallback(() => {
    setShowConstraintIndicator(true);

    if (typeof window === "undefined") {
      return;
    }

    if ((indicatorTimeoutRef.current !== null && indicatorTimeoutRef.current !== undefined)) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }

    indicatorTimeoutRef.current = window.setTimeout(() => {
      setShowConstraintIndicator(false);
      indicatorTimeoutRef.current = null;
    }, CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS);
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
  }, [triggerConstraintIndicator, viewportRef]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        (indicatorTimeoutRef.current !== null && indicatorTimeoutRef.current !== undefined)
      ) {
        window.clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  const canUseSplit = useMemo(() => {
    return resolveCanUseSplitLayout({
      viewportWidthPx,
      displayMode,
    });
  }, [displayMode, viewportWidthPx]);

  const effectiveCardLayoutMode = useMemo<CardLayoutMode>(() => {
    if (requestedCardLayoutMode === "split" && !canUseSplit) {
      return splitFallbackLayoutMode;
    }

    return requestedCardLayoutMode;
  }, [canUseSplit, requestedCardLayoutMode, splitFallbackLayoutMode]);

  const currentZoomScope = useMemo(
    () =>
      buildCurrentZoomScope({
        deviceScope,
        cardSetId,
      }),
    [cardSetId, deviceScope],
  );

  // interactionMode は legacy scoped key から unified key へ移行するときだけ利用する。
  // 現行の zoom/presentation policy は view/edit 非依存でなければならない。
  const legacyZoomMigrationHint = useMemo(
    () =>
      buildLegacyZoomMigrationHint({
        displayMode,
        interactionMode,
        cardLayoutMode: requestedCardLayoutMode,
      }),
    [displayMode, interactionMode, requestedCardLayoutMode],
  );

  const zoomPreferenceLookupScope = useMemo(
    () => ({
      ...currentZoomScope,
      ...legacyZoomMigrationHint,
    }),
    [currentZoomScope, legacyZoomMigrationHint],
  );

  const zoomSourceKey = useMemo(
    () => buildCardSetViewZoomPreferenceScopeKey(currentZoomScope),
    [currentZoomScope],
  );

  const usableWidthPx = useMemo(
    () => {
      if (isMobileDeviceScope) {
        return Math.max(0, Math.floor(viewportWidthPx));
      }

      return resolveUsablePresentationWidthPx({ viewportWidthPx });
    },
    [isMobileDeviceScope, viewportWidthPx],
  );

  const maxPresentationWidthPx = useMemo(
    () => {
      if (isMobileDeviceScope) {
        return Math.max(1, Math.floor(usableWidthPx));
      }

      return resolvePresentationMaxWidthPx({
        usableWidthPx,
        displayMode,
        cardLayoutMode: effectiveCardLayoutMode,
      });
    },
    [displayMode, effectiveCardLayoutMode, isMobileDeviceScope, usableWidthPx],
  );

  const defaultZoomPercent = useMemo(
    () => {
      if (isMobileDeviceScope) {
        return 100;
      }

      return resolveZoomDefaultPercent({
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
        canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      });
    },
    [effectiveCardLayoutMode, isMobileDeviceScope, maxPresentationWidthPx],
  );

  const storedPreferredPercent = useMemo(() => {
    if (!cardSetId || isMobileDeviceScope) {
      return null;
    }

    return getCardSetViewZoomPreference(zoomPreferenceLookupScope) ?? null;
  }, [cardSetId, isMobileDeviceScope, zoomPreferenceLookupScope]);

  const preferredZoomPercent = isMobileDeviceScope
    ? 100
    : zoomPreferenceState.scopeKey === zoomSourceKey &&
      (zoomPreferenceState.preferredPercent !== null && zoomPreferenceState.preferredPercent !== undefined)
      ? zoomPreferenceState.preferredPercent
      : (storedPreferredPercent ?? defaultZoomPercent);

  const zoomPercent = useMemo(
    () => clampZoomPercentRange(preferredZoomPercent),
    [preferredZoomPercent],
  );

  useEffect(() => {
    if (
      isMobileDeviceScope ||
      !cardSetId ||
      zoomPreferenceState.scopeKey !== zoomSourceKey ||
      (zoomPreferenceState.preferredPercent === null || zoomPreferenceState.preferredPercent === undefined)
    ) {
      return;
    }

    setCardSetViewZoomPreference(currentZoomScope, zoomPercent);
  }, [
    cardSetId,
    currentZoomScope,
    isMobileDeviceScope,
    zoomPercent,
    zoomPreferenceState.preferredPercent,
    zoomPreferenceState.scopeKey,
    zoomSourceKey,
  ]);

  const presentationWidthPx = useMemo(
    () =>
      resolvePresentationWidthPx({
        zoomPercent,
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
      }),
    [effectiveCardLayoutMode, maxPresentationWidthPx, zoomPercent],
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
      if (isMobileDeviceScope) {
        return;
      }

      setZoomPreferenceState({
        scopeKey: zoomSourceKey,
        preferredPercent: clampZoomPercentRange(nextPercent),
      });
    },
    [isMobileDeviceScope, zoomSourceKey],
  );

  const stepUp = useCallback(() => {
    setZoomPercent(zoomPercent + CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

  const stepDown = useCallback(() => {
    setZoomPercent(zoomPercent - CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT);
  }, [setZoomPercent, zoomPercent]);

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
    canUseSplit,
    effectiveCardLayoutMode,
    showConstraintIndicator: isMobileDeviceScope ? false : showConstraintIndicator,
    presentationWidthPx,
    maxPresentationWidthPx,
  };
};



export { clampZoomPercent, computeDynamicMaxZoomPercent, useCardSetViewZoom };
