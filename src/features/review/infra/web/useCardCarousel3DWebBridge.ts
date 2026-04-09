import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { clampCardCarouselIndex } from "@/features/review/domain/cardCarousel3D";

type CardCarouselScrollBehavior = ScrollBehavior | "instant";

export const useCardCarousel3DWebBridge = ({
  activeIndex,
  itemCount,
  itemSpan,
  scrollDebounceMs,
  onSettledIndexChange,
}: {
  activeIndex: number;
  itemCount: number;
  itemSpan: number;
  scrollDebounceMs: number;
  onSettledIndexChange: (nextIndex: number) => void;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [stageHeight, setStageHeight] = useState<number | undefined>(undefined);
  const [isScrolling, setIsScrolling] = useState(false);

  const isScrollingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const getScrollLeftForIndex = useCallback(
    (index: number) => {
      return index * itemSpan;
    },
    [itemSpan],
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: CardCarouselScrollBehavior = "smooth") => {
      trackRef.current?.scrollTo({
        left: getScrollLeftForIndex(index),
        behavior: behavior === "instant" ? "auto" : behavior,
      });
    },
    [getScrollLeftForIndex],
  );

  const updateStageHeight = useCallback((index: number) => {
    if (isScrollingRef.current) {
      return;
    }

    const target = itemRefs.current[index];
    const measuredHeight = target?.getBoundingClientRect().height ?? 0;

    if (measuredHeight > 0) {
      setStageHeight(measuredHeight);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => updateStageHeight(activeIndex));
    return () => cancelAnimationFrame(id);
  }, [activeIndex, updateStageHeight]);

  useEffect(() => {
    resizeObserverRef.current?.disconnect();

    const target = itemRefs.current[activeIndex];

    if (!target || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateStageHeight(activeIndex));
    observer.observe(target);
    resizeObserverRef.current = observer;

    return () => observer.disconnect();
  }, [activeIndex, updateStageHeight]);

  useLayoutEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [activeIndex]);

  const handleScroll = useCallback(() => {
    if (itemCount <= 0) {
      return;
    }

    setIsScrolling((previous) => (previous ? previous : true));
    isScrollingRef.current = true;
    clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      setIsScrolling(false);

      const track = trackRef.current;

      if (!track) {
        return;
      }

      const nearestIndex = Math.round(track.scrollLeft / itemSpan);
      const clampedIndex = clampCardCarouselIndex(nearestIndex, itemCount);

      onSettledIndexChange(clampedIndex);
      updateStageHeight(clampedIndex);
    }, scrollDebounceMs);
  }, [
    itemCount,
    itemSpan,
    onSettledIndexChange,
    scrollDebounceMs,
    updateStageHeight,
  ]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimerRef.current);
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  return {
    handleScroll,
    isScrolling,
    itemRefs,
    scrollToIndex,
    stageHeight,
    stageRef,
    trackRef,
    updateStageHeight,
  };
};
