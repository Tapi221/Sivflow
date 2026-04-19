import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import { CARD_SET_VIEW_LAYOUT_CONSTRAINT_INDICATOR_DURATION_MS } from "@constants/shared/flashcard";
import type {
  CardLayoutMode,
  CardSetInteractionMode,
  SplitFallbackCardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import {
  clampZoomPercent as clampZoomPercentRange,
  resolveCanUseSplitLayout,
  resolvePresentationMaxWidthPx,
  resolvePresentationWidthPx,
  resolveUsablePresentationWidthPx,
  resolveZoomDefaultPercent,
  resolveZoomScaleFromPresentationWidthPx,
} from "@/features/cardsetview/domain/cardSetViewPresentationPolicy";
import {
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT,
} from "@constants/shared/flashcard";
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

type ZoomPreviewState = {
  scopeKey: string;
  previewPercent: number | null;
};

const DEFAULT_SOURCE_KEY = "__cardsetview_zoom_default__";

export const clampZoomPercent = (value: number) => clampZoomPercentRange(value);
export const computeDynamicMaxZoomPercent = () => 100;

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
}): CardSetViewZoomPreferenceScope => ({
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
  const [showConstraintIndicator, setShowConstraintIndicator] =
    useState<boolean>(false);
  const [zoomPreferenceState, setZoomPreferenceState] =
    useState<ZoomPreferenceState>({
      scopeKey: DEFAULT_SOURCE_KEY,
      preferredPercent: null,
    });
  const [zoomPreviewState, setZoomPreviewState] = useState<ZoomPreviewState>({
    scopeKey: DEFAULT_SOURCE_KEY,
    previewPercent: null,
  });

  const initialMeasurementCompleteRef = useRef<boolean>(false);
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

  const defaultZoomPercent = useMemo(
    () =>
      resolveZoomDefaultPercent({
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
        canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      }),
    [effectiveCardLayoutMode, maxPresentationWidthPx],
  );

  const storedPreferredPercent = useMemo(() => {
    if (!cardSetId) {
      return null;
    }

    return getCardSetViewZoomPreference(zoomPreferenceLookupScope) ?? null;
  }, [cardSetId, zoomPreferenceLookupScope]);

  const committedZoomPercent = useMemo(
    () =>
      clampZoomPercentRange(
        zoomPreferenceState.scopeKey === zoomSourceKey &&
          zoomPreferenceState.preferredPercent != null
          ? zoomPreferenceState.preferredPercent
          : (storedPreferredPercent ?? defaultZoomPercent),
      ),
    [
      defaultZoomPercent,
      storedPreferredPercent,
      zoomPreferenceState.preferredPercent,
      zoomPreferenceState.scopeKey,
      zoomSourceKey,
    ],
  );

  const previewZoomPercent = useMemo(() => {
    if (zoomPreviewState.scopeKey !== zoomSourceKey) {
      return null;
    }

    return zoomPreviewState.previewPercent;
  }, [
    zoomPreviewState.previewPercent,
    zoomPreviewState.scopeKey,
    zoomSourceKey,
  ]);

  const zoomPercent = previewZoomPercent ?? committedZoomPercent;

  useEffect(() => {
    if (
      !cardSetId ||
      zoomPreferenceState.scopeKey !== zoomSourceKey ||
      zoomPreferenceState.preferredPercent == null
    ) {
      return;
    }

    setCardSetViewZoomPreference(currentZoomScope, committedZoomPercent);
  }, [
    cardSetId,
    committedZoomPercent,
    currentZoomScope,
    zoomPreferenceState.preferredPercent,
    zoomPreferenceState.scopeKey,
    zoomSourceKey,
  ]);

  const presentationWidthPx = useMemo(
    () =>
      resolvePresentationWidthPx({
        zoomPercent: committedZoomPercent,
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
      }),
    [committedZoomPercent, effectiveCardLayoutMode, maxPresentationWidthPx],
  );

  const zoomScale = useMemo(
    () =>
      resolveZoomScaleFromPresentationWidthPx({
        presentationWidthPx,
        canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      }),
    [presentationWidthPx],
  );

  const previewPresentationWidthPx = useMemo(
    () =>
      resolvePresentationWidthPx({
        zoomPercent,
        cardLayoutMode: effectiveCardLayoutMode,
        maxPresentationWidthPx,
      }),
    [effectiveCardLayoutMode, maxPresentationWidthPx, zoomPercent],
  );

  const previewZoomScale = useMemo(
    () =>
      resolveZoomScaleFromPresentationWidthPx({
        presentationWidthPx: previewPresentationWidthPx,
        canonicalCardWidthPx: CANONICAL_CARD_WIDTH,
      }),
    [previewPresentationWidthPx],
  );

  const previewScaleFactor = useMemo(() => {
    if (!Number.isFinite(zoomScale) || zoomScale <= 0) {
      return 1;
    }

    const nextFactor = previewZoomScale / zoomScale;
    if (!Number.isFinite(nextFactor) || nextFactor <= 0) {
      return 1;
    }

    return nextFactor;
  }, [previewZoomScale, zoomScale]);

  const isZoomPreviewActive =
    previewZoomPercent != null &&
    Math.abs(previewZoomPercent - committedZoomPercent) >= 0.0005;

  const setPreviewZoomPercent = useCallback(
    (nextPercent: number) => {
      const clampedPercent = clampZoomPercentRange(nextPercent);

      setZoomPreviewState((prevState) => {
        if (
          prevState.scopeKey === zoomSourceKey &&
          prevState.previewPercent === clampedPercent
        ) {
          return prevState;
        }

        return {
          scopeKey: zoomSourceKey,
          previewPercent: clampedPercent,
        };
      });
    },
    [zoomSourceKey],
  );

  const clearPreviewZoomPercent = useCallback(() => {
    setZoomPreviewState((prevState) => {
      if (
        prevState.scopeKey !== zoomSourceKey ||
        prevState.previewPercent == null
      ) {
        return prevState;
      }

      return {
        scopeKey: zoomSourceKey,
        previewPercent: null,
      };
    });
  }, [zoomSourceKey]);

  const commitZoomPercent = useCallback(
    (nextPercent: number) => {
      const clampedPercent = clampZoomPercentRange(nextPercent);

      setZoomPreferenceState((prevState) => {
        if (
          prevState.scopeKey === zoomSourceKey &&
          prevState.preferredPercent === clampedPercent
        ) {
          return prevState;
        }

        return {
          scopeKey: zoomSourceKey,
          preferredPercent: clampedPercent,
        };
      });

      setZoomPreviewState((prevState) => {
        if (
          prevState.scopeKey === zoomSourceKey &&
          prevState.previewPercent == null
        ) {
          return prevState;
        }

        return {
          scopeKey: zoomSourceKey,
          previewPercent: null,
        };
      });
    },
    [zoomSourceKey],
  );

  const setZoomPercent = commitZoomPercent;

  const stepUp = useCallback(() => {
    commitZoomPercent(zoomPercent + CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT);
  }, [commitZoomPercent, zoomPercent]);

  const stepDown = useCallback(() => {
    commitZoomPercent(zoomPercent - CARD_VIEW_ZOOM_BUTTON_STEP_PERCENT);
  }, [commitZoomPercent, zoomPercent]);

  return {
    zoomPercent,
    committedZoomPercent,
    previewZoomPercent,
    zoomScale,
    previewZoomScale,
    previewScaleFactor,
    isZoomPreviewActive,
    viewportWidthPx,
    availableWidthPx: usableWidthPx,
    fixedCardWidthPx: presentationWidthPx,
    fluidAvailableWidthPx: usableWidthPx,
    presentationWidthPx,
    maxPresentationWidthPx,
    minZoomPercent: 0,
    maxZoomPercent: 100,
    defaultZoomPercent,
    setZoomPercent,
    commitZoomPercent,
    setPreviewZoomPercent,
    clearPreviewZoomPercent,
    stepUp,
    stepDown,
    canUseSplit,
    effectiveCardLayoutMode,
    showConstraintIndicator,
  };
};
