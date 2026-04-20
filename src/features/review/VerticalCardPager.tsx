import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import {
  buildVerticalCardPagerItemStyle,
  resolveVerticalCardPagerItemWidthSpec,
  type VerticalCardPagerItemWidthSpec,
} from "./verticalCardPagerWidthSpec";
import { cn } from "@/lib/utils";
import { isTypingTarget } from "@/utils/isTypingTarget";

const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH;
const CARD_GAP = 16;
const SCROLL_PADDING = "50vh";
const VISIBLE_RANGE_OVERSCAN_PX = 2800;
export const ACTIVE_INDEX_RENDER_RADIUS = 6;
const PLACEHOLDER_HEIGHT_PX = 900;
const CARD_RADIUS_SM = 32;
const CARD_RADIUS_MD = 40;
const MEASURED_HEIGHT_EPSILON_PX = 2;
const SCROLL_IDLE_COMMIT_DELAY_MS = 110;

const resolveCardBaseRadius = () => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return CARD_RADIUS_MD;
  }

  return window.matchMedia("(min-width: 768px)").matches
    ? CARD_RADIUS_MD
    : CARD_RADIUS_SM;
};

const borderRadiusCache = new Map<string, string>();

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  window.matchMedia("(min-width: 768px)").addEventListener("change", () => {
    borderRadiusCache.clear();
  });
}

const cardBorderRadius = () => {
  const cacheKey = "base-radius";
  const cached = borderRadiusCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = `${Math.round(Math.max(0, resolveCardBaseRadius()))}px`;
  borderRadiusCache.set(cacheKey, result);
  return result;
};

const resolveNowMs = () => {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
};

type ScrollAnchorFace = "question" | "answer";

type ResolvedScrollAnchorTarget = {
  element: HTMLElement;
  selector: string | null;
  face: ScrollAnchorFace | null;
};

export type VerticalCardPagerProps<T> = {
  cards: T[];
  activeIndex: number;
  onActiveIndexChange: (idx: number) => void;
  onRenderRangeChange?: (range: { start: number; end: number } | null) => void;
  renderCard: (card: T, idx: number, isActive: boolean) => React.ReactNode;
  onFlip?: () => void;
  cardWidth?: number;
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  getScrollAnchorSelector?: (
    card: T,
    idx: number,
    isActive: boolean,
  ) => string | null;
  onActiveScrollAnchorFaceChange?: (face: ScrollAnchorFace | null) => void;
  getCardWidthSpec?: (
    card: T,
    idx: number,
    isActive: boolean,
  ) => VerticalCardPagerItemWidthSpec;
  paddingInlinePx?: number;
  paddingBlock?: string | number;
  getKey?: (card: T, idx: number) => string | number;
  naturalIndexCommitDelayMs?: number;
  freezeActiveIndex?: boolean;
  disableItemChrome?: boolean;
  disableVirtualization?: boolean;
  preserveScrollAnchorKey?: string | number | null;
};

type VirtualLayoutSnapshot = {
  offsets: number[];
  totalHeight: number;
};

type ScrollAnchorSnapshot = {
  activeIndex: number;
  anchorSelector: string | null;
  offsetWithinAnchorPx: number;
};

const isSameRenderRange = (
  left: { start: number; end: number } | null,
  right: { start: number; end: number } | null,
) => {
  if (left === right) return true;
  if (!left || !right) return left === right;

  return left.start === right.start && left.end === right.end;
};

const resolveElementTopWithinContainer = (
  container: HTMLDivElement,
  element: HTMLElement,
) => {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return container.scrollTop + (elementRect.top - containerRect.top);
};

const resolveScrollAnchorElement = (
  itemElement: HTMLDivElement | null,
  selector: string | null,
) => {
  if (!itemElement) {
    return null;
  }

  if (!selector) {
    return itemElement as HTMLElement;
  }

  return (
    (itemElement.querySelector(selector) as HTMLElement | null) ?? itemElement
  );
};

const resolveScrollAnchorFaceFromElement = (
  element: HTMLElement | null,
): ScrollAnchorFace | null => {
  if (!element) {
    return null;
  }

  const face = element.getAttribute("data-card-face");
  return face === "question" || face === "answer" ? face : null;
};

const buildScrollAnchorFaceSelector = (
  face: ScrollAnchorFace | null,
): string | null => {
  return face ? `[data-card-face="${face}"]` : null;
};

const resolveAutoScrollAnchorTarget = ({
  container,
  itemElement,
}: {
  container: HTMLDivElement;
  itemElement: HTMLDivElement;
}): ResolvedScrollAnchorTarget => {
  const faceElements = Array.from(
    itemElement.querySelectorAll<HTMLElement>("[data-card-face]"),
  );

  if (faceElements.length === 0) {
    return {
      element: itemElement,
      selector: null,
      face: null,
    };
  }

  const viewportTop = container.scrollTop + 1;
  let selectedElement = faceElements[0];

  for (const faceElement of faceElements) {
    const faceTop = resolveElementTopWithinContainer(container, faceElement);
    if (faceTop <= viewportTop) {
      selectedElement = faceElement;
      continue;
    }

    break;
  }

  const face = resolveScrollAnchorFaceFromElement(selectedElement);
  return {
    element: selectedElement,
    selector: buildScrollAnchorFaceSelector(face),
    face,
  };
};

const resolveScrollAnchorTarget = ({
  container,
  itemElement,
  selector,
}: {
  container: HTMLDivElement;
  itemElement: HTMLDivElement;
  selector: string | null;
}): ResolvedScrollAnchorTarget | null => {
  if (selector) {
    const anchorElement = resolveScrollAnchorElement(itemElement, selector);
    if (!anchorElement) {
      return null;
    }

    const face = resolveScrollAnchorFaceFromElement(anchorElement);
    return {
      element: anchorElement,
      selector: buildScrollAnchorFaceSelector(face) ?? selector,
      face,
    };
  }

  return resolveAutoScrollAnchorTarget({ container, itemElement });
};

const buildVirtualLayoutSnapshot = ({
  count,
  getEstimatedHeight,
}: {
  count: number;
  getEstimatedHeight: (index: number) => number;
}): VirtualLayoutSnapshot => {
  const offsets = new Array<number>(count + 1);
  offsets[0] = 0;

  for (let index = 0; index < count; index += 1) {
    const itemHeight = getEstimatedHeight(index);
    offsets[index + 1] = offsets[index] + itemHeight + CARD_GAP;
  }

  const totalHeight = count === 0 ? 0 : Math.max(0, offsets[count] - CARD_GAP);

  return {
    offsets,
    totalHeight,
  };
};

const binarySearchIndexForOffset = (
  layout: VirtualLayoutSnapshot,
  offset: number,
  count: number,
) => {
  if (count <= 0) {
    return -1;
  }

  let low = 0;
  let high = count - 1;
  let answer = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const itemTop = layout.offsets[mid] ?? 0;
    const itemBottom = layout.offsets[mid + 1] ?? itemTop;

    if (offset < itemTop) {
      high = mid - 1;
      continue;
    }

    answer = mid;

    if (offset >= itemBottom) {
      low = mid + 1;
      continue;
    }

    return mid;
  }

  return Math.max(0, Math.min(count - 1, answer));
};

const clampIndex = (idx: number, count: number) => {
  if (count <= 0) return -1;
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(count - 1, Math.trunc(idx)));
};

const resolveVisibleRenderRange = ({
  count,
  activeIndex,
  disableVirtualization,
  layout,
  scrollTop,
  viewportHeight,
}: {
  count: number;
  activeIndex: number;
  disableVirtualization: boolean;
  layout: VirtualLayoutSnapshot;
  scrollTop: number;
  viewportHeight: number;
}) => {
  if (count === 0) {
    return null;
  }

  if (disableVirtualization) {
    return {
      start: 0,
      end: count - 1,
      visibleStart: 0,
      visibleEnd: count - 1,
    };
  }

  const rangeTop = Math.max(0, scrollTop - VISIBLE_RANGE_OVERSCAN_PX);
  const rangeBottom = Math.max(
    rangeTop,
    scrollTop + viewportHeight + VISIBLE_RANGE_OVERSCAN_PX,
  );

  const visibleStart = binarySearchIndexForOffset(layout, rangeTop, count);
  const visibleEnd = binarySearchIndexForOffset(layout, rangeBottom, count);

  const radiusStart = Math.max(0, activeIndex - ACTIVE_INDEX_RENDER_RADIUS);
  const radiusEnd = Math.min(
    count - 1,
    activeIndex + ACTIVE_INDEX_RENDER_RADIUS,
  );

  return {
    start: Math.min(visibleStart, radiusStart),
    end: Math.max(visibleEnd, radiusEnd),
    visibleStart,
    visibleEnd,
  };
};

const findNearestRenderedIndexByCenterY = ({
  container,
  itemRefs,
  stableCardKeys,
  renderRange,
  targetCenterY,
  fallbackIndex,
}: {
  container: HTMLDivElement;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  stableCardKeys: string[];
  renderRange:
    | {
        start: number;
        end: number;
        visibleStart: number;
        visibleEnd: number;
      }
    | null;
  targetCenterY: number;
  fallbackIndex: number;
}) => {
  if (!renderRange) {
    return fallbackIndex;
  }

  let nearestIndex = fallbackIndex;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = renderRange.start; index <= renderRange.end; index += 1) {
    const stableKey = stableCardKeys[index];
    const element = stableKey ? itemRefs.current.get(stableKey) ?? null : null;
    if (!element) continue;

    const elementTop = resolveElementTopWithinContainer(container, element);
    const elementCenterY = elementTop + element.offsetHeight / 2;
    const distance = Math.abs(elementCenterY - targetCenterY);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
};

const buildStableCardKey = <T,>(
  card: T,
  idx: number,
  getKey?: (card: T, idx: number) => string | number,
) => {
  return String(getKey ? getKey(card, idx) : idx);
};

const VerticalCardPagerFn = <T,>({
  cards,
  activeIndex,
  onActiveIndexChange,
  renderCard,
  onFlip,
  cardWidth = DEFAULT_CARD_WIDTH,
  getCardWidth,
  onActiveScrollAnchorFaceChange,
  getScrollAnchorSelector,
  getCardWidthSpec,
  paddingInlinePx = 16,
  paddingBlock = SCROLL_PADDING,
  getKey,
  naturalIndexCommitDelayMs = 0,
  freezeActiveIndex = false,
  disableItemChrome = false,
  disableVirtualization = false,
  onRenderRangeChange,
  preserveScrollAnchorKey = null,
}: VerticalCardPagerProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const itemCleanupMapRef = useRef<Map<string, () => void>>(new Map());
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const avgItemExtentRef = useRef(PLACEHOLDER_HEIGHT_PX);
  const activeIndexRef = useRef(activeIndex);
  const onRenderRangeChangeRef = useRef(onRenderRangeChange);
  const emittedRenderRangeRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const layoutVersionRafRef = useRef<number | null>(null);

  const anchorCorrectionRafRef = useRef<number | null>(null);
  const anchorStabilizationUntilRef = useRef<number>(0);
  const visibleRangeRafRef = useRef<number | null>(null);
  const scrollAnchorCaptureRafRef = useRef<number | null>(null);
  const computeNearestRafRef = useRef<number | null>(null);
  const idleCommitTimerRef = useRef<number | null>(null);
  const naturalIndexTimerRef = useRef<number | null>(null);
  const queuedNaturalIndexRef = useRef<number | null>(null);
  const lastNearestIndexRef = useRef(Math.max(0, activeIndex));

  const [viewportState, setViewportState] = useState({
    scrollTop: 0,
    clientHeight: 0,
  });
  const [layoutVersion, setLayoutVersion] = useState(0);
  const preserveKey =
    preserveScrollAnchorKey == null ? null : String(preserveScrollAnchorKey);

  const scrollAnchorSnapshotRef = useRef<ScrollAnchorSnapshot | null>(null);
  const previousPreserveKeyRef = useRef<string | null>(preserveKey);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (Number.isFinite(activeIndex) && activeIndex >= 0) {
      lastNearestIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  useEffect(() => {
    onRenderRangeChangeRef.current = onRenderRangeChange;
  }, [onRenderRangeChange]);

  const stableCardKeys = useMemo(
    () => cards.map((card, idx) => buildStableCardKey(card, idx, getKey)),
    [cards, getKey],
  );

  const getEstimatedHeight = useCallback(
    (index: number) => {
      const stableKey = stableCardKeys[index];
      if (!stableKey) {
        return avgItemExtentRef.current;
      }

      return (
        measuredHeightsRef.current.get(stableKey) ?? avgItemExtentRef.current
      );
    },
    [stableCardKeys],
  );

  const layoutSnapshot = useMemo(
    () =>
      buildVirtualLayoutSnapshot({
        count: cards.length,
        getEstimatedHeight,
      }),
    [cards.length, getEstimatedHeight, layoutVersion],
  );

  const renderRange = useMemo(
    () =>
      resolveVisibleRenderRange({
        count: cards.length,
        activeIndex,
        disableVirtualization,
        layout: layoutSnapshot,
        scrollTop: viewportState.scrollTop,
        viewportHeight: viewportState.clientHeight,
      }),
    [
      activeIndex,
      cards.length,
      disableVirtualization,
      layoutSnapshot,
      viewportState.clientHeight,
      viewportState.scrollTop,
    ],
  );

  const topSpacerHeight =
    renderRange && renderRange.start > 0
      ? (layoutSnapshot.offsets[renderRange.start] ?? 0)
      : 0;
  const bottomSpacerHeight =
    renderRange && renderRange.end < cards.length - 1
      ? Math.max(
          0,
          layoutSnapshot.totalHeight -
            (layoutSnapshot.offsets[renderRange.end + 1] ?? 0),
        )
      : 0;

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container) return;

      const clampedIndex = clampIndex(idx, cards.length);
      if (clampedIndex < 0) return;

      const itemTop = layoutSnapshot.offsets[clampedIndex] ?? 0;
      const itemHeight = getEstimatedHeight(clampedIndex);
      const targetTop = itemTop - container.clientHeight / 2 + itemHeight / 2;

      const maxScrollTop = Math.max(
        0,
        layoutSnapshot.totalHeight - container.clientHeight,
      );
      const nextTop = Math.min(Math.max(0, targetTop), maxScrollTop);

      container.scrollTo({
        top: nextTop,
        behavior,
      });
    },
    [cards.length, getEstimatedHeight, layoutSnapshot],
  );

  const clearNaturalIndexTimer = useCallback(() => {
    if (naturalIndexTimerRef.current != null) {
      window.clearTimeout(naturalIndexTimerRef.current);
      naturalIndexTimerRef.current = null;
    }
  }, []);

  const clearIdleCommitTimer = useCallback(() => {
    if (idleCommitTimerRef.current != null) {
      window.clearTimeout(idleCommitTimerRef.current);
      idleCommitTimerRef.current = null;
    }
  }, []);

  const clearComputeNearestRaf = useCallback(() => {
    if (computeNearestRafRef.current != null) {
      window.cancelAnimationFrame(computeNearestRafRef.current);
      computeNearestRafRef.current = null;
    }
  }, []);

  const clearScrollAnchorCaptureRaf = useCallback(() => {
    if (scrollAnchorCaptureRafRef.current != null) {
      window.cancelAnimationFrame(scrollAnchorCaptureRafRef.current);
      scrollAnchorCaptureRafRef.current = null;
    }
  }, []);

  const flushQueuedNaturalIndex = useCallback(() => {
    const nearestIdx = queuedNaturalIndexRef.current;
    queuedNaturalIndexRef.current = null;
    clearNaturalIndexTimer();

    if (nearestIdx == null || nearestIdx === activeIndexRef.current) return;
    onActiveIndexChange(nearestIdx);
  }, [clearNaturalIndexTimer, onActiveIndexChange]);

  const queueNaturalIndexCommit = useCallback(
    (nearestIdx: number) => {
      queuedNaturalIndexRef.current = nearestIdx;
      clearNaturalIndexTimer();

      if (naturalIndexCommitDelayMs <= 0) {
        flushQueuedNaturalIndex();
        return;
      }

      naturalIndexTimerRef.current = window.setTimeout(() => {
        flushQueuedNaturalIndex();
      }, naturalIndexCommitDelayMs);
    },
    [
      clearNaturalIndexTimer,
      flushQueuedNaturalIndex,
      naturalIndexCommitDelayMs,
    ],
  );

  const computeNearestIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (cards.length <= 0) return;
    if (freezeActiveIndex) return;

    const centerOffset = container.scrollTop + container.clientHeight / 2;
    const fallbackNearestIdx = binarySearchIndexForOffset(
      layoutSnapshot,
      centerOffset,
      cards.length,
    );
    const nearestIdx = findNearestRenderedIndexByCenterY({
      container,
      itemRefs,
      stableCardKeys,
      renderRange,
      targetCenterY: centerOffset,
      fallbackIndex: fallbackNearestIdx,
    });
    if (nearestIdx < 0) {
      return;
    }

    lastNearestIndexRef.current = nearestIdx;
    if (nearestIdx === activeIndexRef.current) {
      return;
    }

    queueNaturalIndexCommit(nearestIdx);
  }, [
    cards.length,
    freezeActiveIndex,
    itemRefs,
    layoutSnapshot,
    queueNaturalIndexCommit,
    renderRange,
    stableCardKeys,
  ]);

  const scheduleVisibleRangeUpdate = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (visibleRangeRafRef.current != null) {
      return;
    }

    visibleRangeRafRef.current = window.requestAnimationFrame(() => {
      visibleRangeRafRef.current = null;
      const container = containerRef.current;
      if (!container) {
        return;
      }

      setViewportState((previousState) => {
        const nextState = {
          scrollTop: container.scrollTop,
          clientHeight: container.clientHeight,
        };

        if (
          previousState.scrollTop === nextState.scrollTop &&
          previousState.clientHeight === nextState.clientHeight
        ) {
          return previousState;
        }

        return nextState;
      });
    });
  }, []);

  const captureScrollAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeCard = cards[activeIndex];
    const activeStableKey = stableCardKeys[activeIndex];
    const activeElement = activeStableKey
      ? (itemRefs.current.get(activeStableKey) ?? null)
      : null;

    if (!activeElement || !activeCard) return;

    const anchorSelector =
      getScrollAnchorSelector?.(activeCard, activeIndex, true) ?? null;

    const resolvedAnchorTarget = resolveScrollAnchorTarget({
      container,
      itemElement: activeElement,
      selector: anchorSelector,
    });

    if (!resolvedAnchorTarget) {
      onActiveScrollAnchorFaceChange?.(null);
      return;
    }

    const {
      element: anchorElement,
      selector: resolvedAnchorSelector,
      face: anchorFace,
    } = resolvedAnchorTarget;

    const anchorTopWithinContainerPx = resolveElementTopWithinContainer(
      container,
      anchorElement,
    );

    onActiveScrollAnchorFaceChange?.(anchorFace);
    scrollAnchorSnapshotRef.current = {
      activeIndex,
      anchorSelector: resolvedAnchorSelector,
      offsetWithinAnchorPx: Math.max(
        0,
        container.scrollTop - anchorTopWithinContainerPx,
      ),
    };
  }, [
    activeIndex,
    cards,
    getScrollAnchorSelector,
    onActiveScrollAnchorFaceChange,
    stableCardKeys,
  ]);

  const scheduleScrollAnchorCapture = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (scrollAnchorCaptureRafRef.current != null) {
      return;
    }

    scrollAnchorCaptureRafRef.current = window.requestAnimationFrame(() => {
      scrollAnchorCaptureRafRef.current = null;
      captureScrollAnchor();
    });
  }, [captureScrollAnchor]);

  const restoreScrollAnchor = useCallback(() => {
    const container = containerRef.current;
    const snapshot = scrollAnchorSnapshotRef.current;
    const activeStableKey = stableCardKeys[activeIndex];
    const activeElement = activeStableKey
      ? (itemRefs.current.get(activeStableKey) ?? null)
      : null;

    if (!container || !snapshot || !activeElement) {
      return;
    }

    if (snapshot.activeIndex !== activeIndex) {
      return;
    }

    const anchorElement = resolveScrollAnchorElement(
      activeElement,
      snapshot.anchorSelector,
    );

    if (!anchorElement) {
      return;
    }

    const currentAnchorTopWithinContainerPx = resolveElementTopWithinContainer(
      container,
      anchorElement,
    );

    const maxScrollTop = Math.max(
      0,
      layoutSnapshot.totalHeight - container.clientHeight,
    );

    const nextTop = Math.min(
      Math.max(
        0,
        currentAnchorTopWithinContainerPx + snapshot.offsetWithinAnchorPx,
      ),
      maxScrollTop,
    );

    container.scrollTop = nextTop;
    scrollAnchorSnapshotRef.current = {
      activeIndex,
      anchorSelector: snapshot.anchorSelector,
      offsetWithinAnchorPx: Math.max(
        0,
        nextTop - resolveElementTopWithinContainer(container, anchorElement),
      ),
    };
  }, [activeIndex, layoutSnapshot.totalHeight, stableCardKeys]);

  const scheduleAnchorCorrection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (anchorCorrectionRafRef.current != null) {
      return;
    }

    anchorCorrectionRafRef.current = window.requestAnimationFrame(() => {
      anchorCorrectionRafRef.current = null;
      restoreScrollAnchor();
      scheduleVisibleRangeUpdate();
    });
  }, [restoreScrollAnchor, scheduleVisibleRangeUpdate]);

  useEffect(() => {
    const nextEffectiveRange =
      renderRange == null
        ? null
        : {
            start: renderRange.start,
            end: renderRange.end,
          };

    if (isSameRenderRange(emittedRenderRangeRef.current, nextEffectiveRange)) {
      return;
    }

    emittedRenderRangeRef.current = nextEffectiveRange;
    onRenderRangeChangeRef.current?.(nextEffectiveRange);
  }, [renderRange]);

  useEffect(() => {
    emittedRenderRangeRef.current = null;
  }, [cards.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const syncViewportState = () => {
      setViewportState((previousState) => {
        const nextState = {
          scrollTop: container.scrollTop,
          clientHeight: container.clientHeight,
        };

        if (
          previousState.scrollTop === nextState.scrollTop &&
          previousState.clientHeight === nextState.clientHeight
        ) {
          return previousState;
        }

        return nextState;
      });
    };

    syncViewportState();

    const handleScroll = () => {
      scheduleScrollAnchorCapture();
      scheduleVisibleRangeUpdate();
      clearIdleCommitTimer();
      idleCommitTimerRef.current = window.setTimeout(() => {
        idleCommitTimerRef.current = null;
        computeNearestIndex();
      }, SCROLL_IDLE_COMMIT_DELAY_MS);

      if (computeNearestRafRef.current != null) {
        return;
      }

      computeNearestRafRef.current = window.requestAnimationFrame(() => {
        computeNearestRafRef.current = null;
        computeNearestIndex();
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", syncViewportState, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", syncViewportState);
    };
  }, [
    clearIdleCommitTimer,
    computeNearestIndex,
    scheduleScrollAnchorCapture,
    scheduleVisibleRangeUpdate,
  ]);

  useLayoutEffect(() => {
    captureScrollAnchor();
  }, [activeIndex, captureScrollAnchor, renderRange?.start, renderRange?.end]);

  useLayoutEffect(() => {
    const previousPreserveKey = previousPreserveKeyRef.current;
    previousPreserveKeyRef.current = preserveKey;

    if (
      preserveKey == null ||
      previousPreserveKey == null ||
      previousPreserveKey === preserveKey
    ) {
      return;
    }

    anchorStabilizationUntilRef.current = resolveNowMs() + 400;
    restoreScrollAnchor();
    scheduleVisibleRangeUpdate();
    scheduleAnchorCorrection();
  }, [
    preserveKey,
    restoreScrollAnchor,
    scheduleAnchorCorrection,
    scheduleVisibleRangeUpdate,
  ]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        if (anchorCorrectionRafRef.current != null) {
          window.cancelAnimationFrame(anchorCorrectionRafRef.current);
        }

        if (visibleRangeRafRef.current != null) {
          window.cancelAnimationFrame(visibleRangeRafRef.current);
        }

        if (layoutVersionRafRef.current != null) {
          window.cancelAnimationFrame(layoutVersionRafRef.current);
          layoutVersionRafRef.current = null;
        }

        clearScrollAnchorCaptureRaf();
        clearComputeNearestRaf();
        clearIdleCommitTimer();
        clearNaturalIndexTimer();
      }

      itemCleanupMapRef.current.forEach((cleanup) => {
        cleanup();
      });
      itemCleanupMapRef.current.clear();
      itemRefs.current.clear();
    };
  }, [
    clearComputeNearestRaf,
    clearIdleCommitTimer,
    clearNaturalIndexTimer,
    clearScrollAnchorCaptureRaf,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey) return;

      switch (event.key) {
        case " ":
          if (event.shiftKey) return;
          event.preventDefault();
          onFlip?.();
          break;
        case "Enter":
          onFlip?.();
          break;
        case "ArrowDown": {
          event.preventDefault();
          if (freezeActiveIndex) return;
          const nextIndex = Math.min(
            activeIndexRef.current + 1,
            cards.length - 1,
          );
          if (nextIndex !== activeIndexRef.current) {
            clearNaturalIndexTimer();
            queuedNaturalIndexRef.current = null;
            scrollToIndex(nextIndex, "smooth");
          }
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (freezeActiveIndex) return;
          const previousIndex = Math.max(activeIndexRef.current - 1, 0);
          if (previousIndex !== activeIndexRef.current) {
            clearNaturalIndexTimer();
            queuedNaturalIndexRef.current = null;
            scrollToIndex(previousIndex, "smooth");
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cards.length,
    clearNaturalIndexTimer,
    freezeActiveIndex,
    onFlip,
    scrollToIndex,
  ]);

  const handleMeasuredHeight = useCallback(
    (stableKey: string, nextHeight: number) => {
      const safeHeight = Math.max(1, Math.round(nextHeight));
      const previousHeight = measuredHeightsRef.current.get(stableKey);

      if (
        previousHeight != null &&
        Math.abs(previousHeight - safeHeight) < MEASURED_HEIGHT_EPSILON_PX
      ) {
        return;
      }

      measuredHeightsRef.current.set(stableKey, safeHeight);
      avgItemExtentRef.current = Math.round(
        (avgItemExtentRef.current + safeHeight) / 2,
      );

      if (layoutVersionRafRef.current != null) {
        return;
      }

      layoutVersionRafRef.current = window.requestAnimationFrame(() => {
        layoutVersionRafRef.current = null;
        setLayoutVersion((previousVersion) => previousVersion + 1);
      });
    },
    [],
  );

  const attachMeasuredRef = useCallback(
    (stableKey: string, element: HTMLDivElement | null) => {
      itemCleanupMapRef.current.get(stableKey)?.();
      itemCleanupMapRef.current.delete(stableKey);
      itemRefs.current.set(stableKey, element);

      if (!element || typeof ResizeObserver === "undefined") {
        return;
      }

      const update = () => {
        handleMeasuredHeight(stableKey, element.offsetHeight);
        if (resolveNowMs() <= anchorStabilizationUntilRef.current) {
          scheduleAnchorCorrection();
        }
      };

      update();

      const observer = new ResizeObserver(update);
      observer.observe(element);

      itemCleanupMapRef.current.set(stableKey, () => {
        observer.disconnect();
        itemRefs.current.delete(stableKey);
      });
    },
    [handleMeasuredHeight, scheduleAnchorCorrection],
  );

  const renderedItems = useMemo(() => {
    if (!renderRange) {
      return [] as Array<{
        card: T;
        idx: number;
        key: string;
        isActive: boolean;
        style: React.CSSProperties;
      }>;
    }

    const items: Array<{
      card: T;
      idx: number;
      key: string;
      isActive: boolean;
      style: React.CSSProperties;
    }> = [];

    for (let idx = renderRange.start; idx <= renderRange.end; idx += 1) {
      const card = cards[idx];
      const isActive = idx === activeIndex;
      const stableKey = stableCardKeys[idx];
      const widthSpec = resolveVerticalCardPagerItemWidthSpec({
        card,
        idx,
        isActive,
        cardWidth,
        getCardWidth,
        getCardWidthSpec,
      });

      items.push({
        card,
        idx,
        key: stableKey,
        isActive,
        style: buildVerticalCardPagerItemStyle(widthSpec),
      });
    }

    return items;
  }, [
    activeIndex,
    cardWidth,
    cards,
    getCardWidth,
    getCardWidthSpec,
    renderRange,
    stableCardKeys,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarGutter: "stable",
        height: "100%",
        position: "relative",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: CARD_GAP,
          paddingBlock,
          paddingInline: paddingInlinePx,
          minWidth: 0,
        }}
      >
        {topSpacerHeight > 0 ? (
          <div
            aria-hidden
            style={{
              width: "100%",
              height: `${topSpacerHeight}px`,
              flex: "0 0 auto",
            }}
          />
        ) : null}

        {renderedItems.map(({ card, idx, key, isActive, style }) => (
          <div
            key={key}
            ref={(element) => {
              attachMeasuredRef(key, element);
            }}
            aria-current={isActive ? "true" : undefined}
            data-card-active={isActive ? "true" : undefined}
            data-card-hoverable={disableItemChrome ? undefined : "true"}
            className={cn(
              "card-active-chrome",
              "card-pager-item",
              isActive && "card-active-chrome--active",
              !disableItemChrome && "card-active-chrome--hoverable",
              disableItemChrome &&
                "card-active-chrome--plain card-pager-item--plain",
            )}
            style={{
              ...style,
              borderRadius: cardBorderRadius(),
            }}
          >
            {renderCard(card, idx, isActive)}
          </div>
        ))}

        {bottomSpacerHeight > 0 ? (
          <div
            aria-hidden
            style={{
              width: "100%",
              height: `${bottomSpacerHeight}px`,
              flex: "0 0 auto",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export const VerticalCardPager = React.memo(
  VerticalCardPagerFn,
) as typeof VerticalCardPagerFn;

export type { VerticalCardPagerItemWidthSpec } from "./verticalCardPagerWidthSpec";
