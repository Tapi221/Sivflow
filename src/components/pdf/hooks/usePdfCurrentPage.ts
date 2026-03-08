import { useCallback, useEffect, useRef, useState } from "react";

interface UsePdfCurrentPageParams {
  doc: unknown;
  numPages: number;
  scale: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pageRefsRef: React.RefObject<Array<HTMLDivElement | null>>;
  visibilityRatiosRef: React.RefObject<Record<number, number>>;
  currentPageRef: React.RefObject<number>;
  onPageChange?: (page: number) => void;
}

export interface UsePdfCurrentPageResult {
  currentPage: number;
  handleScroll: () => void;
  handleVisibilityChange: (pageNumber: number, ratio: number) => void;
  scrollToPage: (page: number) => void;
}

export function usePdfCurrentPage({
  doc,
  numPages,
  scale,
  scrollContainerRef,
  pageRefsRef,
  visibilityRatiosRef,
  currentPageRef,
  onPageChange,
}: UsePdfCurrentPageParams): UsePdfCurrentPageResult {
  const [currentPage, setCurrentPage] = useState(1);
  const onPageChangeRef = useRef(onPageChange);
  const rafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const pageChangeRafRef = useRef<number | null>(null);
  const pendingPageRef = useRef<number | null>(null);

  useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);

  const scheduleOnPageChange = useCallback((page: number) => {
    pendingPageRef.current = page;
    if (pageChangeRafRef.current !== null) return;
    pageChangeRafRef.current = requestAnimationFrame(() => {
      pageChangeRafRef.current = null;
      const pending = pendingPageRef.current;
      pendingPageRef.current = null;
      if (typeof pending === "number") onPageChangeRef.current?.(pending);
    });
  }, []);

  const setCurrentPageSafe = useCallback((page: number) => {
    const clamped = Math.min(Math.max(page, 1), Math.max(numPages, 1));
    if (currentPageRef.current === clamped) return;
    currentPageRef.current = clamped;
    setCurrentPage(clamped);
    scheduleOnPageChange(clamped);
  }, [numPages, currentPageRef, scheduleOnPageChange]);

  const estimateCurrentPageFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages <= 0) return;
    const targetTop = container.scrollTop;
    let lo = 0;
    let hi = numPages - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const midEl = pageRefsRef.current[mid];
      const midTop = midEl ? midEl.offsetTop : Number.MAX_SAFE_INTEGER;
      if (midTop < targetTop) lo = mid + 1;
      else hi = mid;
    }
    const rightIndex = lo;
    const leftIndex = Math.max(0, rightIndex - 1);
    const leftTop = pageRefsRef.current[leftIndex]?.offsetTop ?? 0;
    const rightTop = pageRefsRef.current[rightIndex]?.offsetTop ?? Number.MAX_SAFE_INTEGER;
    const nearestIndex =
      Math.abs(leftTop - targetTop) <= Math.abs(rightTop - targetTop) ? leftIndex : rightIndex;
    setCurrentPageSafe(nearestIndex + 1);
  }, [numPages, scrollContainerRef, pageRefsRef, setCurrentPageSafe]);

  const schedulePageUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const entries = Object.entries(visibilityRatiosRef.current);
      if (entries.length === 0) return;
      let maxPage = 1;
      let maxRatio = -1;
      for (const [key, ratio] of entries) {
        const page = Number(key);
        if (!Number.isFinite(page) || !Number.isFinite(ratio)) continue;
        if (ratio > maxRatio) { maxRatio = ratio; maxPage = page; }
      }
      if (maxRatio < 0.05) return;
      setCurrentPageSafe(maxPage);
    });
  }, [visibilityRatiosRef, setCurrentPageSafe]);

  const handleVisibilityChange = useCallback((pageNumber: number, ratio: number) => {
    if (ratio < 0.05) delete visibilityRatiosRef.current[pageNumber];
    else visibilityRatiosRef.current[pageNumber] = ratio;
    schedulePageUpdate();
  }, [visibilityRatiosRef, schedulePageUpdate]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      estimateCurrentPageFromScroll();
    });
  }, [estimateCurrentPageFromScroll]);

  const scrollToPage = useCallback((page: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const clamped = Math.min(Math.max(page, 1), numPages || 1);
    const target = pageRefsRef.current[clamped - 1];
    if (!target) return;
    container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }, [numPages, scrollContainerRef, pageRefsRef]);

  useEffect(() => {
    if (!doc) return;
    schedulePageUpdate();
  }, [doc, scale, schedulePageUpdate]);

  useEffect(() => {
    if (!doc || numPages <= 0) return;
    estimateCurrentPageFromScroll();
  }, [doc, numPages, estimateCurrentPageFromScroll]);

  // Cleanup all RAFs on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
      if (pageChangeRafRef.current !== null) { cancelAnimationFrame(pageChangeRafRef.current); pageChangeRafRef.current = null; }
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      pendingPageRef.current = null;
    };
  }, []);

  return { currentPage, handleScroll, handleVisibilityChange, scrollToPage };
}




