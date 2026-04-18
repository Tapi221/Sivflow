import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CANONICAL_CARD_WIDTH } from "@constants/shared/flashcard";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
import {
  buildVerticalCardPagerItemStyle,
  resolveVerticalCardPagerItemWidthSpec,
  type VerticalCardPagerItemWidthSpec,
} from "./verticalCardPagerWidthSpec";
import { cn } from "@/lib/utils";

const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH;
const CARD_GAP = 16;
const SCROLL_PADDING = "50vh";
const VISIBLE_RANGE_OVERSCAN_PX = 2800;
export const ACTIVE_INDEX_RENDER_RADIUS = 6;
const PLACEHOLDER_HEIGHT_PX = 900;
const CARD_RADIUS_SM = 32;
const CARD_RADIUS_MD = 40;

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
  const avgItemExtentRef = useRef(900);
  const anchorCorrectionRafRef = useRef<number | null>(null);
  const anchorStabilizationUntilRef = useRef<number>(0);
  const visibleRangeRafRef = useRef<number | null>(null);
  const visibleRangeRef = useRef<{ start: number; end: number } | null>(null);
  const effectiveRenderRangeRef = useRef<{
    start: number;
    end: number;
  } | null>(null);

  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const { itemRefs } = useVerticalCardPager({
    count: cards.length,
    activeIndex,
    onActiveIndexChange,
    scrollContainerRef: containerRef,
    onFlip,
    naturalIndexCommitDelayMs,
    freezeActiveIndex,
  });

  const activeIndexRef = useRef(activeIndex);
  const onRenderRangeChangeRef = useRef(onRenderRangeChange);
  const preserveKey =
    preserveScrollAnchorKey == null ? null : String(preserveScrollAnchorKey);

  const scrollAnchorSnapshotRef = useRef<{
    activeIndex: number;
    anchorSelector: string | null;
    offsetWithinAnchorPx: number;
  } | null>(null);

  const previousPreserveKeyRef = useRef<string | null>(preserveKey);

  const captureScrollAnchorRef = useRef<() => void>(() => {});
  const restoreScrollAnchorRef = useRef<() => void>(() => {});
  const updateVisibleRangeRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onRenderRangeChangeRef.current = onRenderRangeChange;
  }, [onRenderRangeChange]);

  const captureScrollAnchor = () => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = itemRefs.current[activeIndex];
    const activeCard = cards[activeIndex];
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
  };

  const restoreScrollAnchor = () => {
    const container = containerRef.current;
    const snapshot = scrollAnchorSnapshotRef.current;
    const activeElement = itemRefs.current[activeIndex];

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
      container.scrollHeight - container.clientHeight,
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
  };

  const updateVisibleRange = () => {
    const container = containerRef.current;
    if (!container) return;

    if (disableVirtualization) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;
      setVisibleRange(null);
      onRenderRangeChangeRef.current?.(null);
      return;
    }

    if (cards.length === 0) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;
      setVisibleRange(null);
      onRenderRangeChangeRef.current?.(null);
      return;
    }

    const top = container.scrollTop - VISIBLE_RANGE_OVERSCAN_PX;
    const bottom =
      container.scrollTop + container.clientHeight + VISIBLE_RANGE_OVERSCAN_PX;

    const estimatedIndex = Math.max(
      0,
      Math.min(
        cards.length - 1,
        Math.round(container.scrollTop / Math.max(1, avgItemExtentRef.current)),
      ),
    );

    const getItemTop = (idx: number): number | null => {
      const element = itemRefs.current[idx];
      if (!element) return null;
      return element.offsetTop;
    };

    const getItemBottom = (idx: number): number | null => {
      const element = itemRefs.current[idx];
      if (!element) return null;
      return element.offsetTop + element.offsetHeight;
    };

    let start = Math.max(0, estimatedIndex - ACTIVE_INDEX_RENDER_RADIUS);

    while (start > 0) {
      const prevBottom = getItemBottom(start - 1);
      if (prevBottom == null || prevBottom < top) break;
      start -= 1;
    }

    while (start < cards.length) {
      const currentBottom = getItemBottom(start);
      if (currentBottom == null) {
        start += 1;
        continue;
      }

      if (currentBottom >= top) break;
      start += 1;
    }

    let nextRange: { start: number; end: number } | null = null;

    if (start < cards.length) {
      let end = Math.max(start, estimatedIndex + ACTIVE_INDEX_RENDER_RADIUS);
      if (end >= cards.length) end = cards.length - 1;

      while (end + 1 < cards.length) {
        const nextTop = getItemTop(end + 1);
        if (nextTop == null || nextTop > bottom) break;
        end += 1;
      }

      while (end >= start) {
        const endTop = getItemTop(end);
        if (endTop != null && endTop <= bottom) break;
        end -= 1;
      }

      if (end >= start) {
        nextRange = { start, end };
      }
    }

    const currentActiveIndex = activeIndexRef.current;
    const radiusStart = Math.max(
      0,
      currentActiveIndex - ACTIVE_INDEX_RENDER_RADIUS,
    );
    const radiusEnd = Math.min(
      cards.length - 1,
      currentActiveIndex + ACTIVE_INDEX_RENDER_RADIUS,
    );

    const effectiveStart = nextRange
      ? Math.min(nextRange.start, radiusStart)
      : radiusStart;

    const effectiveEnd = nextRange
      ? Math.max(nextRange.end, radiusEnd)
      : radiusEnd;

    const nextEffective = { start: effectiveStart, end: effectiveEnd };
    visibleRangeRef.current = nextRange;
    effectiveRenderRangeRef.current = nextEffective;
    setVisibleRange(nextRange);
    onRenderRangeChangeRef.current?.(nextEffective);
  };

  captureScrollAnchorRef.current = captureScrollAnchor;
  restoreScrollAnchorRef.current = restoreScrollAnchor;
  updateVisibleRangeRef.current = updateVisibleRange;

  const scheduleAnchorCorrection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (anchorCorrectionRafRef.current != null) {
      return;
    }

    anchorCorrectionRafRef.current = window.requestAnimationFrame(() => {
      anchorCorrectionRafRef.current = null;
      restoreScrollAnchorRef.current();
      updateVisibleRangeRef.current();
    });
  }, []);

  const scheduleVisibleRangeUpdate = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (visibleRangeRafRef.current != null) {
      return;
    }

    visibleRangeRafRef.current = window.requestAnimationFrame(() => {
      visibleRangeRafRef.current = null;
      updateVisibleRangeRef.current();
    });
  }, []);

  useEffect(() => {
    if (disableVirtualization) return;
    scheduleVisibleRangeUpdate();
  }, [disableVirtualization, scheduleVisibleRangeUpdate, cards.length]);

  useEffect(() => {
    if (disableVirtualization) return;
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      captureScrollAnchorRef.current();
      scheduleVisibleRangeUpdate();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", scheduleVisibleRangeUpdate, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", scheduleVisibleRangeUpdate);
    };
  }, [disableVirtualization, scheduleVisibleRangeUpdate]);

  useLayoutEffect(() => {
    captureScrollAnchorRef.current();
  }, [activeIndex]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const activeElement = itemRefs.current[activeIndex];
    const activeCard = cards[activeIndex];

    if (!activeElement || !activeCard) {
      return;
    }

    const anchorSelector =
      getScrollAnchorSelector?.(activeCard, activeIndex, true) ?? null;

    const resolvedAnchorTarget = resolveScrollAnchorTarget({
      container: containerRef.current ?? document.createElement("div"),
      itemElement: activeElement,
      selector: anchorSelector,
    });

    if (!resolvedAnchorTarget) {
      return;
    }

    const anchorElement = resolvedAnchorTarget.element;

    const observer = new ResizeObserver(() => {
      if (resolveNowMs() > anchorStabilizationUntilRef.current) {
        return;
      }

      scheduleAnchorCorrection();
    });

    observer.observe(activeElement);

    if (anchorElement !== activeElement) {
      observer.observe(anchorElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeIndex, cards, getScrollAnchorSelector, scheduleAnchorCorrection]);

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
    restoreScrollAnchorRef.current();
    scheduleVisibleRangeUpdate();
    scheduleAnchorCorrection();
  }, [preserveKey, scheduleAnchorCorrection, scheduleVisibleRangeUpdate]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        if (anchorCorrectionRafRef.current != null) {
          window.cancelAnimationFrame(anchorCorrectionRafRef.current);
        }

        if (visibleRangeRafRef.current != null) {
          window.cancelAnimationFrame(visibleRangeRafRef.current);
        }
      }
    };
  }, []);

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
        {cards.map((card, idx) => {
          const isActive = idx === activeIndex;
          const isVisibleInViewport =
            visibleRange != null &&
            idx >= visibleRange.start &&
            idx <= visibleRange.end;

          const shouldRenderCard =
            disableVirtualization ||
            isVisibleInViewport ||
            Math.abs(idx - activeIndex) <= ACTIVE_INDEX_RENDER_RADIUS;

          const key = getKey ? getKey(card, idx) : idx;

          const widthSpec = resolveVerticalCardPagerItemWidthSpec({
            card,
            idx,
            isActive,
            cardWidth,
            getCardWidth,
            getCardWidthSpec,
          });

          const itemLayoutStyle = buildVerticalCardPagerItemStyle(widthSpec);

          return (
            <div
              key={key}
              ref={(element) => {
                itemRefs.current[idx] = element;
                if (element) {
                  avgItemExtentRef.current = Math.round(
                    (avgItemExtentRef.current + element.offsetHeight) / 2,
                  );
                }
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
                ...itemLayoutStyle,
                borderRadius: cardBorderRadius(),
              }}
            >
              {shouldRenderCard ? (
                renderCard(card, idx, isActive)
              ) : (
                <div
                  aria-hidden
                  className="w-full"
                  style={{
                    height: `${Math.max(
                      1,
                      Math.round(PLACEHOLDER_HEIGHT_PX),
                    )}px`,
                    contentVisibility: "auto",
                    containIntrinsicSize: `auto ${PLACEHOLDER_HEIGHT_PX}px`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VerticalCardPager = React.memo(
  VerticalCardPagerFn,
) as typeof VerticalCardPagerFn;

export type { VerticalCardPagerItemWidthSpec } from "./verticalCardPagerWidthSpec";