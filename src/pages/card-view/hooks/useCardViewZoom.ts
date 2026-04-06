import { useCallback, useEffect, useMemo, useState } from "react";

import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import {
  getCardSetZoomPreference,
  setCardSetZoomPreference,
} from "@/services/cardZoomPreferences";
import {
  CARD_VIEW_DEFAULT_ZOOM_PERCENT,
  CARD_VIEW_MIN_ZOOM_PERCENT,
  CARD_VIEW_ZOOM_STEP_PERCENT,
  clampZoomPercent,
  computeDynamicMaxZoomPercent,
  normalizeZoomPercent,
  zoomPercentToFactor,
  zoomPercentToFixedCardWidthPx,
} from "@/pages/card-view/cardViewZoom";

type KeyedZoomState = {
  sourceKey: string;
  value: number;
};

interface UseCardViewZoomOptions {
  cardSetId?: string | null;
  availableWidthPx: number;
}

export const useCardViewZoom = ({
  cardSetId,
  availableWidthPx,
}: UseCardViewZoomOptions) => {
  const sourceKey = cardSetId ?? "__no-card-set__";

  const maxZoomPercent = useMemo(() => {
    return computeDynamicMaxZoomPercent({
      availableWidthPx,
      baseCardWidthPx: CANONICAL_CARD_WIDTH,
      stepPercent: CARD_VIEW_ZOOM_STEP_PERCENT,
    });
  }, [availableWidthPx]);

  const minZoomPercent = useMemo(() => {
    return Math.min(CARD_VIEW_MIN_ZOOM_PERCENT, maxZoomPercent);
  }, [maxZoomPercent]);

  const defaultZoomPercent = useMemo(() => {
    return clampZoomPercent({
      value: CARD_VIEW_DEFAULT_ZOOM_PERCENT,
      minZoomPercent,
      maxZoomPercent,
    });
  }, [maxZoomPercent, minZoomPercent]);

  const normalizeForViewport = useCallback(
    (value: number) => {
      return normalizeZoomPercent({
        value,
        minZoomPercent,
        maxZoomPercent,
        stepPercent: CARD_VIEW_ZOOM_STEP_PERCENT,
      });
    },
    [maxZoomPercent, minZoomPercent],
  );

  const [zoomState, setZoomState] = useState<KeyedZoomState>(() => {
    const stored = cardSetId ? getCardSetZoomPreference(cardSetId) : undefined;
    const initialValue = normalizeForViewport(
      stored ?? CARD_VIEW_DEFAULT_ZOOM_PERCENT,
    );

    return {
      sourceKey,
      value: initialValue,
    };
  });

  const zoomPercent =
    zoomState.sourceKey === sourceKey ? zoomState.value : defaultZoomPercent;

  useEffect(() => {
    const stored = cardSetId ? getCardSetZoomPreference(cardSetId) : undefined;
    const nextValue = normalizeForViewport(stored ?? CARD_VIEW_DEFAULT_ZOOM_PERCENT);

    setZoomState((prev) => {
      if (prev.sourceKey === sourceKey && prev.value === nextValue) {
        return prev;
      }

      return {
        sourceKey,
        value: nextValue,
      };
    });
  }, [cardSetId, normalizeForViewport, sourceKey]);

  useEffect(() => {
    const clamped = normalizeForViewport(zoomPercent);
    if (clamped === zoomPercent) return;

    setZoomState({
      sourceKey,
      value: clamped,
    });

    if (cardSetId) {
      setCardSetZoomPreference(cardSetId, clamped);
    }
  }, [cardSetId, normalizeForViewport, sourceKey, zoomPercent]);

  const previewZoomPercent = useCallback(
    (nextValue: number) => {
      setZoomState({
        sourceKey,
        value: normalizeForViewport(nextValue),
      });
    },
    [normalizeForViewport, sourceKey],
  );

  const commitZoomPercent = useCallback(
    (nextValue: number) => {
      const normalized = normalizeForViewport(nextValue);

      setZoomState({
        sourceKey,
        value: normalized,
      });

      if (cardSetId) {
        setCardSetZoomPreference(cardSetId, normalized);
      }
    },
    [cardSetId, normalizeForViewport, sourceKey],
  );

  const stepDown = useCallback(() => {
    commitZoomPercent(zoomPercent - CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [commitZoomPercent, zoomPercent]);

  const stepUp = useCallback(() => {
    commitZoomPercent(zoomPercent + CARD_VIEW_ZOOM_STEP_PERCENT);
  }, [commitZoomPercent, zoomPercent]);

  const resetZoom = useCallback(() => {
    commitZoomPercent(defaultZoomPercent);
  }, [commitZoomPercent, defaultZoomPercent]);

  const zoomFactor = useMemo(() => {
    return zoomPercentToFactor(zoomPercent);
  }, [zoomPercent]);

  const fixedCardWidthPx = useMemo(() => {
    return zoomPercentToFixedCardWidthPx(zoomPercent);
  }, [zoomPercent]);

  return {
    zoomPercent,
    zoomFactor,
    fixedCardWidthPx,
    minZoomPercent,
    maxZoomPercent,
    defaultZoomPercent,
    previewZoomPercent,
    commitZoomPercent,
    stepDown,
    stepUp,
    resetZoom,
  };
};
