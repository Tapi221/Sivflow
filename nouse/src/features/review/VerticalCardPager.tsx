import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { cn } from "@web-renderer/lib/utils";
import { CANONICAL_CARD_WIDTH } from "@/domain/card/cardGeometry.constants";
import type { VerticalCardPagerItemWidthSpec } from "./verticalCardPagerWidthSpec";
import { buildVerticalCardPagerItemStyle, resolveVerticalCardPagerItemWidthSpec } from "./verticalCardPagerWidthSpec";
import { isTypingTarget } from "@/utils/isTypingTarget";



type ScrollAnchorFace = "question" | "answer";
type ScrollAnchorSnapshot = {
  preserveKey: string | number | null;
  cardKey: string | null;
  relativeTop: number;
};
type VerticalCardPagerProps<T> = {
  cards: T[];
  activeIndex: number;
  onActiveIndexChange: (idx: number) => void;
  onRenderRangeChange?: (range: { start: number; end: number } | null) => void;
  renderCard: (card: T, idx: number, isActive: boolean) => React.ReactNode;
  onFlip?: () => void;
  cardWidth?: number;
  getCardWidth?: (card: T, idx: number, isActive: boolean) => number;
  getScrollAnchorSelector?: (card: T, idx: number, isActive: boolean) => string | null;
  onActiveScrollAnchorFaceChange?: (face: ScrollAnchorFace | null) => void;
  getCardWidthSpec?: (card: T, idx: number, isActive: boolean) => VerticalCardPagerItemWidthSpec;
  paddingInlinePx?: number;
  paddingBlock?: string | number;
  getKey?: (card: T, idx: number) => string | number;
  naturalIndexCommitDelayMs?: number;
  freezeActiveIndex?: boolean;
  disableItemChrome?: boolean;
  disableVirtualization?: boolean;
  preserveScrollAnchorKey?: string | number | null;
  scrollToActiveIndexRequestKey?: string | number | null;
  scrollToActiveIndexBehavior?: ScrollBehavior;
};



const ACTIVE_INDEX_RENDER_RADIUS = 6;
const DEFAULT_CARD_WIDTH = CANONICAL_CARD_WIDTH;
const CARD_GAP = 16;
const SCROLL_PADDING = "50vh";
const CARD_RADIUS_SM = 32;
const CARD_RADIUS_MD = 40;
const SCROLL_IDLE_COMMIT_DELAY_MS = 110;
const SCROLL_ANCHOR_SUPPRESSION_MS = 180;



const buildStableCardKey = <T,>(card: T, idx: number, getKey?: (card: T, idx: number) => string | number) => {
  return String(getKey ? getKey(card, idx) : idx);
};
const resolveScrollAnchorFaceFromElement = (element: HTMLElement | null): ScrollAnchorFace | null => {
  if (!element) return null;
  const face = element.getAttribute("data-card-face");
  return face === "question" || face === "answer" ? face : null;
};
const getCurrentTimeMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
};
const resolveCardBaseRadius = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return CARD_RADIUS_MD;
  }

  return window.matchMedia("(min-width: 768px)").matches ? CARD_RADIUS_MD : CARD_RADIUS_SM;
};
const cardBorderRadius = () => `${Math.round(Math.max(0, resolveCardBaseRadius()))}px`;
const clampIndex = (idx: number, count: number) => {
  if (count <= 0) return -1;
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(count - 1, Math.trunc(idx)));
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
  onRenderRangeChange,
  preserveScrollAnchorKey = null,
  scrollToActiveIndexRequestKey = null,
  scrollToActiveIndexBehavior = "auto",
}: VerticalCardPagerProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const activeIndexRef = useRef(activeIndex);
  const naturalIndexTimerRef = useRef<number | null>(null);
  const lastScrollToActiveIndexRequestKeyRef = useRef<string | number | null>(scrollToActiveIndexRequestKey);
  const scrollAnchorSnapshotRef = useRef<ScrollAnchorSnapshot | null>(null);
  const suppressNaturalIndexUntilRef = useRef(0);

  const stableCardKeys = useMemo(() => cards.map((card, idx) => buildStableCardKey(card, idx, getKey)), [cards, getKey]);

  const renderedItems = useMemo(() => {
    return cards.map((card, idx) => {
      const isActive = idx === activeIndex;
      const widthSpec = resolveVerticalCardPagerItemWidthSpec({ card, idx, isActive, cardWidth, getCardWidth, getCardWidthSpec });

      return {
        card,
        idx,
        key: stableCardKeys[idx] ?? String(idx),
        isActive,
        style: buildVerticalCardPagerItemStyle(widthSpec),
      };
    });
  }, [activeIndex, cardWidth, cards, getCardWidth, getCardWidthSpec, stableCardKeys]);

  const clearNaturalIndexTimer = useCallback(() => {
    if (naturalIndexTimerRef.current === null || naturalIndexTimerRef.current === undefined) return;

    window.clearTimeout(naturalIndexTimerRef.current);
    naturalIndexTimerRef.current = null;
  }, []);

  const suppressNaturalIndexCommit = useCallback(() => {
    suppressNaturalIndexUntilRef.current = getCurrentTimeMs() + SCROLL_ANCHOR_SUPPRESSION_MS;
    clearNaturalIndexTimer();
  }, [clearNaturalIndexTimer]);

  const isNaturalIndexCommitSuppressed = useCallback(() => {
    return getCurrentTimeMs() < suppressNaturalIndexUntilRef.current;
  }, []);

  const resolveActiveAnchorElement = useCallback(() => {
    const container = containerRef.current;
    const activeCard = cards[activeIndex];
    const activeKey = stableCardKeys[activeIndex] ?? null;
    const activeElement = activeKey ? itemRefs.current.get(activeKey) ?? null : null;
    if (!container || !activeElement || !activeCard || !activeKey) {
      return null;
    }

    const selector = getScrollAnchorSelector?.(activeCard, activeIndex, true) ?? null;
    const anchorElement = selector ? activeElement.querySelector<HTMLElement>(selector) : activeElement;
    if (!anchorElement) {
      return null;
    }

    return { container, activeKey, anchorElement };
  }, [activeIndex, cards, getScrollAnchorSelector, stableCardKeys]);

  const readScrollAnchorSnapshot = useCallback((): ScrollAnchorSnapshot | null => {
    const resolved = resolveActiveAnchorElement();
    if (!resolved) {
      return null;
    }

    const containerRect = resolved.container.getBoundingClientRect();
    const anchorRect = resolved.anchorElement.getBoundingClientRect();

    return {
      preserveKey: preserveScrollAnchorKey,
      cardKey: resolved.activeKey,
      relativeTop: anchorRect.top - containerRect.top,
    };
  }, [preserveScrollAnchorKey, resolveActiveAnchorElement]);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;

    const clampedIndex = clampIndex(idx, cards.length);
    if (clampedIndex < 0) return;

    const stableKey = stableCardKeys[clampedIndex];
    const itemElement = stableKey ? itemRefs.current.get(stableKey) : null;
    if (!itemElement) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = itemElement.getBoundingClientRect();
    const itemTop = container.scrollTop + itemRect.top - containerRect.top;
    const targetTop = itemTop - container.clientHeight / 2 + itemElement.offsetHeight / 2;

    container.scrollTo({ top: Math.max(0, targetTop), behavior });
  }, [cards.length, stableCardKeys]);

  const commitNearestIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container || freezeActiveIndex || cards.length <= 0 || isNaturalIndexCommitSuppressed()) return;

    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;
    let nearestIndex = activeIndexRef.current;
    let nearestDistance = Number.POSITIVE_INFINITY;

    stableCardKeys.forEach((key, idx) => {
      const itemElement = itemRefs.current.get(key);
      if (!itemElement) return;
      const itemRect = itemElement.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenterY - centerY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = idx;
      }
    });

    if (nearestIndex !== activeIndexRef.current) {
      onActiveIndexChange(nearestIndex);
    }
  }, [cards.length, freezeActiveIndex, isNaturalIndexCommitSuppressed, onActiveIndexChange, stableCardKeys]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    onRenderRangeChange?.(cards.length > 0 ? { start: 0, end: cards.length - 1 } : null);
  }, [cards.length, onRenderRangeChange]);

  useLayoutEffect(() => {
    const previousSnapshot = scrollAnchorSnapshotRef.current;
    const resolved = resolveActiveAnchorElement();

    if (previousSnapshot && resolved && previousSnapshot.preserveKey !== preserveScrollAnchorKey && previousSnapshot.cardKey === resolved.activeKey) {
      const containerRect = resolved.container.getBoundingClientRect();
      const anchorRect = resolved.anchorElement.getBoundingClientRect();
      const relativeTop = anchorRect.top - containerRect.top;
      const scrollDelta = relativeTop - previousSnapshot.relativeTop;

      if (Math.abs(scrollDelta) >= 0.5) {
        suppressNaturalIndexCommit();
        resolved.container.scrollTop += scrollDelta;
      }
    }

    scrollAnchorSnapshotRef.current = readScrollAnchorSnapshot();
  }, [preserveScrollAnchorKey, readScrollAnchorSnapshot, resolveActiveAnchorElement, suppressNaturalIndexCommit]);

  useEffect(() => {
    const activeCard = cards[activeIndex];
    const activeKey = stableCardKeys[activeIndex];
    const activeElement = activeKey ? itemRefs.current.get(activeKey) : null;
    const selector = activeCard ? getScrollAnchorSelector?.(activeCard, activeIndex, true) : null;
    const anchorElement = selector && activeElement ? activeElement.querySelector<HTMLElement>(selector) : activeElement;
    onActiveScrollAnchorFaceChange?.(resolveScrollAnchorFaceFromElement(anchorElement ?? null));
  }, [activeIndex, cards, getScrollAnchorSelector, onActiveScrollAnchorFaceChange, stableCardKeys]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isNaturalIndexCommitSuppressed()) {
        clearNaturalIndexTimer();
        return;
      }

      clearNaturalIndexTimer();
      naturalIndexTimerRef.current = window.setTimeout(() => {
        naturalIndexTimerRef.current = null;
        commitNearestIndex();
      }, Math.max(0, naturalIndexCommitDelayMs || SCROLL_IDLE_COMMIT_DELAY_MS));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearNaturalIndexTimer();
    };
  }, [clearNaturalIndexTimer, commitNearestIndex, isNaturalIndexCommitSuppressed, naturalIndexCommitDelayMs]);

  useEffect(() => {
    if (scrollToActiveIndexRequestKey === null || scrollToActiveIndexRequestKey === undefined) return;
    if (lastScrollToActiveIndexRequestKeyRef.current === scrollToActiveIndexRequestKey) return;

    lastScrollToActiveIndexRequestKeyRef.current = scrollToActiveIndexRequestKey;
    scrollToIndex(activeIndex, scrollToActiveIndexBehavior);
  }, [activeIndex, scrollToActiveIndexBehavior, scrollToActiveIndexRequestKey, scrollToIndex]);

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
          scrollToIndex(Math.min(activeIndexRef.current + 1, cards.length - 1), "smooth");
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (freezeActiveIndex) return;
          scrollToIndex(Math.max(activeIndexRef.current - 1, 0), "smooth");
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards.length, freezeActiveIndex, onFlip, scrollToIndex]);

  return (
    <div ref={containerRef} style={{ overflowY: "auto", overflowX: "hidden", scrollbarGutter: "stable", height: "100%", position: "relative", minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: CARD_GAP, paddingBlock, paddingInline: paddingInlinePx, minWidth: 0 }}>
        {renderedItems.map(({ card, idx, key, isActive, style }) => (
          <div
            key={key}
            ref={(element) => {
              itemRefs.current.set(key, element);
            }}
            aria-current={isActive ? "true" : undefined}
            data-card-active={isActive ? "true" : undefined}
            data-card-hoverable={disableItemChrome ? undefined : "true"}
            className={cn("card-active-chrome", "card-pager-item", isActive && "card-active-chrome--active", !disableItemChrome && "card-active-chrome--hoverable", disableItemChrome && "card-active-chrome--plain card-pager-item--plain")}
            style={{ ...style, borderRadius: cardBorderRadius() }}
          >
            {renderCard(card, idx, isActive)}
          </div>
        ))}
      </div>
    </div>
  );
};



const VerticalCardPager = React.memo(VerticalCardPagerFn) as typeof VerticalCardPagerFn;



export { VerticalCardPager, ACTIVE_INDEX_RENDER_RADIUS };


export type { VerticalCardPagerItemWidthSpec } from "./verticalCardPagerWidthSpec";
export type { VerticalCardPagerProps };
