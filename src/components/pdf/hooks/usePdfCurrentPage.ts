import { useCallback, useEffect, useRef, useState } from "react";
import { PDF_PAGE_VISIBILITY_THRESHOLD } from "@/components/pdf/pdfViewerConstants";
import type { PdfScrollDiagnostics } from "@/components/pdf/pdfViewerTypes";

interface UsePdfCurrentPageOptions {
  numPages: number;
  pageTopOffsets: number[];
  onPageChange?: (page: number) => void;
}

interface UsePdfCurrentPageResult {
  containerRef: (el: HTMLDivElement | null) => void;
  scrollContainerEl: HTMLDivElement | null;
  currentPage: number;
  handleScroll: () => void;
  handleVisibilityChange: (pageNumber: number, ratio: number) => void;
  notifyLayoutChanged: () => void;
  resetNavigation: () => void;
  scrollToPage: (page: number) => void;
  getScrollDiagnostics: () => PdfScrollDiagnostics | null;
  logScrollDiagnostics: () => void;
}

const clampPage = (page: number, numPages: number) => {
  const safeMax = Math.max(numPages, 1);
  return Math.min(Math.max(page, 1), safeMax);
};

const findNearestPageFromOffsets = ({
  scrollTop,
  pageTopOffsets,
  numPages,
}: {
  scrollTop: number;
  pageTopOffsets: number[];
  numPages: number;
}) => {
  if (numPages <= 0 || pageTopOffsets.length === 0) {
    return 1;
  }

  let lo = 0;
  let hi = Math.min(numPages, pageTopOffsets.length) - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midTop = pageTopOffsets[mid] ?? Number.MAX_SAFE_INTEGER;

    if (midTop < scrollTop) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const rightIndex = lo;
  const leftIndex = Math.max(0, rightIndex - 1);
  const leftTop = pageTopOffsets[leftIndex] ?? 0;
  const rightTop = pageTopOffsets[rightIndex] ?? Number.MAX_SAFE_INTEGER;

  const nearestIndex =
    Math.abs(leftTop - scrollTop) <= Math.abs(rightTop - scrollTop)
      ? leftIndex
      : rightIndex;

  return clampPage(nearestIndex + 1, numPages);
};

export const usePdfCurrentPage = ({
  numPages,
  pageTopOffsets,
  onPageChange,
}: UsePdfCurrentPageOptions): UsePdfCurrentPageResult => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainerEl, setScrollContainerEl] =
    useState<HTMLDivElement | null>(null);

  const visibilityRatiosRef = useRef<Record<number, number>>({});
  const currentPageRef = useRef(1);
  const onPageChangeRef = useRef(onPageChange);
  const pageTopOffsetsRef = useRef(pageTopOffsets);

  const scrollRafRef = useRef<number | null>(null);
  const pageChangeRafRef = useRef<number | null>(null);
  const pageUpdateRafRef = useRef<number | null>(null);
  const stateSyncRafRef = useRef<number | null>(null);
  const pendingPageForCallbackRef = useRef<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    pageTopOffsetsRef.current = pageTopOffsets;
  }, [pageTopOffsets]);

  const cancelPendingRafs = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    if (pageChangeRafRef.current !== null) {
      cancelAnimationFrame(pageChangeRafRef.current);
      pageChangeRafRef.current = null;
    }

    if (pageUpdateRafRef.current !== null) {
      cancelAnimationFrame(pageUpdateRafRef.current);
      pageUpdateRafRef.current = null;
    }

    if (stateSyncRafRef.current !== null) {
      cancelAnimationFrame(stateSyncRafRef.current);
      stateSyncRafRef.current = null;
    }
  }, []);

  const scheduleOnPageChange = useCallback((page: number) => {
    pendingPageForCallbackRef.current = page;

    if (pageChangeRafRef.current !== null) return;

    pageChangeRafRef.current = requestAnimationFrame(() => {
      pageChangeRafRef.current = null;

      const pendingPage = pendingPageForCallbackRef.current;
      pendingPageForCallbackRef.current = null;

      if (typeof pendingPage === "number") {
        onPageChangeRef.current?.(pendingPage);
      }
    });
  }, []);

  const scheduleCurrentPageStateSync = useCallback((page: number) => {
    if (stateSyncRafRef.current !== null) {
      cancelAnimationFrame(stateSyncRafRef.current);
    }

    stateSyncRafRef.current = requestAnimationFrame(() => {
      stateSyncRafRef.current = null;
      setCurrentPage(page);
    });
  }, []);

  const commitCurrentPage = useCallback(
    (nextPage: number) => {
      const clamped = clampPage(nextPage, numPages);
      if (currentPageRef.current === clamped) return;

      currentPageRef.current = clamped;
      scheduleCurrentPageStateSync(clamped);
      scheduleOnPageChange(clamped);
    },
    [numPages, scheduleCurrentPageStateSync, scheduleOnPageChange],
  );

  const estimateCurrentPageFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages <= 0) return;

    const nextPage = findNearestPageFromOffsets({
      scrollTop: container.scrollTop,
      pageTopOffsets: pageTopOffsetsRef.current,
      numPages,
    });

    commitCurrentPage(nextPage);
  }, [commitCurrentPage, numPages]);

  const schedulePageUpdate = useCallback(() => {
    if (pageUpdateRafRef.current !== null) return;

    pageUpdateRafRef.current = requestAnimationFrame(() => {
      pageUpdateRafRef.current = null;

      let maxPage: number | null = null;
      let maxRatio = -1;

      for (const [key, ratio] of Object.entries(visibilityRatiosRef.current)) {
        const page = Number(key);
        if (!Number.isFinite(page) || !Number.isFinite(ratio)) continue;
        if (ratio <= maxRatio) continue;

        maxRatio = ratio;
        maxPage = page;
      }

      if (
        typeof maxPage === "number" &&
        maxRatio >= PDF_PAGE_VISIBILITY_THRESHOLD
      ) {
        commitCurrentPage(maxPage);
        return;
      }

      estimateCurrentPageFromScroll();
    });
  }, [commitCurrentPage, estimateCurrentPageFromScroll]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      estimateCurrentPageFromScroll();
    });
  }, [estimateCurrentPageFromScroll]);

  const handleVisibilityChange = useCallback(
    (pageNumber: number, ratio: number) => {
      if (ratio < PDF_PAGE_VISIBILITY_THRESHOLD) {
        delete visibilityRatiosRef.current[pageNumber];
      } else {
        visibilityRatiosRef.current[pageNumber] = ratio;
      }

      schedulePageUpdate();
    },
    [schedulePageUpdate],
  );

  const notifyLayoutChanged = useCallback(() => {
    schedulePageUpdate();
  }, [schedulePageUpdate]);

  const resetNavigation = useCallback(() => {
    cancelPendingRafs();
    pendingPageForCallbackRef.current = null;
    visibilityRatiosRef.current = {};
    currentPageRef.current = 1;
    scheduleCurrentPageStateSync(1);
    scheduleOnPageChange(1);

    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [cancelPendingRafs, scheduleCurrentPageStateSync, scheduleOnPageChange]);

  const scrollToPage = useCallback(
    (page: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const clamped = clampPage(page, numPages);
      const targetTop = pageTopOffsetsRef.current[clamped - 1] ?? 0;
      container.scrollTo({ top: targetTop, behavior: "smooth" });
    },
    [numPages],
  );

  const getScrollDiagnostics = useCallback((): PdfScrollDiagnostics | null => {
    const container = scrollContainerRef.current;
    if (!container) return null;

    const style = window.getComputedStyle(container);
    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );

    const ancestorTransforms: PdfScrollDiagnostics["ancestorTransforms"] = [];
    let current: HTMLElement | null = container.parentElement;

    while (current) {
      const currentStyle = window.getComputedStyle(current);

      if (currentStyle.transform && currentStyle.transform !== "none") {
        ancestorTransforms.push({
          tag: current.tagName.toLowerCase(),
          className: current.className || "",
          transform: currentStyle.transform,
        });
      }

      current = current.parentElement;
    }

    return {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      maxScrollTop,
      overflowY: style.overflowY,
      overscrollBehaviorY: style.overscrollBehaviorY,
      isScrollable:
        maxScrollTop > 0 &&
        ["auto", "scroll", "overlay"].includes(style.overflowY),
      numPages,
      currentPage,
      ancestorTransforms,
    };
  }, [currentPage, numPages]);

  const logScrollDiagnostics = useCallback(() => {
    console.info("[PdfViewer] scroll diagnostics", getScrollDiagnostics());
  }, [getScrollDiagnostics]);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
    setScrollContainerEl((previous) => (previous === el ? previous : el));
  }, []);

  useEffect(() => {
    if (numPages <= 0) {
      visibilityRatiosRef.current = {};

      if (currentPageRef.current !== 1) {
        currentPageRef.current = 1;
        scheduleCurrentPageStateSync(1);
        scheduleOnPageChange(1);
      }

      return;
    }

    const nextRatios: Record<number, number> = {};

    for (const [key, ratio] of Object.entries(visibilityRatiosRef.current)) {
      const page = Number(key);
      if (!Number.isFinite(page) || page < 1 || page > numPages) continue;
      nextRatios[page] = ratio;
    }

    visibilityRatiosRef.current = nextRatios;

    const clamped = clampPage(currentPageRef.current, numPages);

    if (clamped !== currentPageRef.current) {
      currentPageRef.current = clamped;
      scheduleCurrentPageStateSync(clamped);
      scheduleOnPageChange(clamped);
      return;
    }

    if (currentPage !== clamped) {
      scheduleCurrentPageStateSync(clamped);
    }
  }, [
    currentPage,
    numPages,
    scheduleCurrentPageStateSync,
    scheduleOnPageChange,
  ]);

  useEffect(() => {
    schedulePageUpdate();
  }, [pageTopOffsets, schedulePageUpdate]);

  useEffect(() => {
    return () => {
      cancelPendingRafs();
      pendingPageForCallbackRef.current = null;
    };
  }, [cancelPendingRafs]);

  return {
    containerRef,
    scrollContainerEl,
    currentPage,
    handleScroll,
    handleVisibilityChange,
    notifyLayoutChanged,
    resetNavigation,
    scrollToPage,
    getScrollDiagnostics,
    logScrollDiagnostics,
  };
};
