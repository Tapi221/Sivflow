import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CANONICAL_CARD_WIDTH } from "@/components/card/common/constants";
import { useVerticalCardPager } from "@/hooks/study/useVerticalCardPager";
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

export type VerticalCardPagerItemWidthSpec =
  | { mode: "fixed"; widthPx: number }
  | { mode: "stretch" };

type ResolveVerticalCardPagerItemWidthSpecOptions<T> = {
  card: T;
  idx: number;
  isActive: boolean;
  cardWidth: number;
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  getCardWidthSpec?: (
    card: T,
    idx: number,
    isActive: boolean,
  ) => VerticalCardPagerItemWidthSpec;
};

const sanitizeVerticalCardPagerItemWidthSpec = (
  widthSpec: VerticalCardPagerItemWidthSpec,
): VerticalCardPagerItemWidthSpec => {
  if (widthSpec.mode === "stretch") {
    return { mode: "stretch" };
  }

  return {
    mode: "fixed",
    widthPx: Math.max(1, Math.round(widthSpec.widthPx)),
  };
};

const resolveVerticalCardPagerItemWidthSpec = <T,>({
  card,
  idx,
  isActive,
  cardWidth,
  getCardWidth,
  getCardWidthSpec,
}: ResolveVerticalCardPagerItemWidthSpecOptions<T>): VerticalCardPagerItemWidthSpec => {
  if (getCardWidthSpec) {
    return sanitizeVerticalCardPagerItemWidthSpec(
      getCardWidthSpec(card, idx, isActive),
    );
  }

  const resolvedWidthPx = getCardWidth
    ? getCardWidth(card, idx, isActive)
    : cardWidth;

  return sanitizeVerticalCardPagerItemWidthSpec({
    mode: "fixed",
    widthPx: resolvedWidthPx,
  });
};

const buildVerticalCardPagerItemStyle = (
  widthSpec: VerticalCardPagerItemWidthSpec,
): React.CSSProperties => {
  if (widthSpec.mode === "stretch") {
    return {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      alignSelf: "stretch",
    };
  }

  return {
    width: widthSpec.widthPx,
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "center",
  };
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

const VerticalCardPagerFn = <T,>({
  cards,
  activeIndex,
  onActiveIndexChange,
  renderCard,
  onFlip,
  cardWidth = DEFAULT_CARD_WIDTH,
  getCardWidth,
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
    offsetWithinCardPx: number;
  } | null>(null);

  const previousPreserveKeyRef = useRef<string | null>(preserveKey);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onRenderRangeChangeRef.current = onRenderRangeChange;
  }, [onRenderRangeChange]);

  const captureScrollAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = itemRefs.current[activeIndex];
    if (!activeElement) return;

    scrollAnchorSnapshotRef.current = {
      activeIndex,
      offsetWithinCardPx: Math.max(
        0,
        container.scrollTop - activeElement.offsetTop,
      ),
    };
  }, [activeIndex, itemRefs]);

  const updateVisibleRange = useCallback(() => {
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

    if (nextRange != null) {
      const sampleElement =
        itemRefs.current[Math.min(nextRange.end, activeIndexRef.current)];

      if (sampleElement) {
        const extent = Math.max(1, sampleElement.offsetHeight + CARD_GAP);
        avgItemExtentRef.current =
          avgItemExtentRef.current * 0.8 + extent * 0.2;
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

    const prevRange = visibleRangeRef.current;
    const prevEffective = effectiveRenderRangeRef.current;

    if (
      prevRange?.start === nextRange?.start &&
      prevRange?.end === nextRange?.end &&
      prevEffective?.start === nextEffective.start &&
      prevEffective?.end === nextEffective.end
    ) {
      return;
    }

    visibleRangeRef.current = nextRange;
    effectiveRenderRangeRef.current = nextEffective;
    setVisibleRange(nextRange);
    onRenderRangeChangeRef.current?.(nextEffective);
  }, [cards.length, disableVirtualization, itemRefs]);

  const scheduleVisibleRangeUpdate = useCallback(() => {
    if (visibleRangeRafRef.current != null) return;

    visibleRangeRafRef.current = window.requestAnimationFrame(() => {
      visibleRangeRafRef.current = null;
      updateVisibleRange();
    });
  }, [updateVisibleRange]);

  useEffect(() => {
    if (disableVirtualization) return;
    scheduleVisibleRangeUpdate();
  }, [disableVirtualization, scheduleVisibleRangeUpdate]);

  useEffect(() => {
    if (disableVirtualization) {
      visibleRangeRef.current = null;
      effectiveRenderRangeRef.current = null;

      if (visibleRangeRafRef.current != null) {
        window.cancelAnimationFrame(visibleRangeRafRef.current);
        visibleRangeRafRef.current = null;
      }

      window.requestAnimationFrame(() => {
        onRenderRangeChangeRef.current?.(null);
      });

      return;
    }

    scheduleVisibleRangeUpdate();

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      captureScrollAnchor();
      scheduleVisibleRangeUpdate();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", scheduleVisibleRangeUpdate, {
      passive: true,
    });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            captureScrollAnchor();
            scheduleVisibleRangeUpdate();
          })
        : null;

    observer?.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", scheduleVisibleRangeUpdate);
      observer?.disconnect();

      if (visibleRangeRafRef.current != null) {
        window.cancelAnimationFrame(visibleRangeRafRef.current);
        visibleRangeRafRef.current = null;
      }
    };
  }, [
    cards.length,
    captureScrollAnchor,
    disableVirtualization,
    scheduleVisibleRangeUpdate,
  ]);

  useLayoutEffect(() => {
    captureScrollAnchor();
  }, [captureScrollAnchor, activeIndex]);

  useLayoutEffect(() => {
    const previousKey = previousPreserveKeyRef.current;
    previousPreserveKeyRef.current = preserveKey;

    if (previousKey == null || preserveKey == null) return;
    if (previousKey === preserveKey) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = itemRefs.current[activeIndex];
    if (!activeElement) return;

    const previousSnapshot = scrollAnchorSnapshotRef.current;

    const offsetWithinCardPx =
      previousSnapshot?.activeIndex === activeIndex
        ? previousSnapshot.offsetWithinCardPx
        : Math.max(0, container.scrollTop - activeElement.offsetTop);

    const nextScrollTop = Math.max(
      0,
      activeElement.offsetTop + offsetWithinCardPx,
    );

    if (Math.abs(container.scrollTop - nextScrollTop) > 1) {
      container.scrollTop = nextScrollTop;
    }

    window.requestAnimationFrame(() => {
      captureScrollAnchor();
      scheduleVisibleRangeUpdate();
    });
  }, [
    activeIndex,
    captureScrollAnchor,
    itemRefs,
    preserveKey,
    scheduleVisibleRangeUpdate,
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

export {
  buildVerticalCardPagerItemStyle,
  resolveVerticalCardPagerItemWidthSpec,
};
