import { useCallback } from "react";

interface ScrollDiagnostics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  maxScrollTop: number;
  overflowY: string;
  overscrollBehaviorY: string;
  isScrollable: boolean;
  numPages: number;
  currentPage: number;
  ancestorTransforms: Array<{ tag: string; className: string; transform: string }>;
}

interface UsePdfScrollDiagnosticsParams {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  numPages: number;
  currentPageRef: React.RefObject<number>;
}

export interface UsePdfScrollDiagnosticsResult {
  getScrollDiagnostics: () => ScrollDiagnostics | null;
  logScrollDiagnostics: () => void;
}

export function usePdfScrollDiagnostics({
  scrollContainerRef,
  numPages,
  currentPageRef,
}: UsePdfScrollDiagnosticsParams): UsePdfScrollDiagnosticsResult {
  const getScrollDiagnostics = useCallback((): ScrollDiagnostics | null => {
    const container = scrollContainerRef.current;
    if (!container) return null;
    const style = window.getComputedStyle(container);
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const ancestorTransforms: ScrollDiagnostics["ancestorTransforms"] = [];
    let current: HTMLElement | null = container.parentElement;
    while (current) {
      const s = window.getComputedStyle(current);
      if (s.transform && s.transform !== "none") {
        ancestorTransforms.push({
          tag: current.tagName.toLowerCase(),
          className: current.className || "",
          transform: s.transform,
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
      isScrollable: maxScrollTop > 0 && ["auto", "scroll", "overlay"].includes(style.overflowY),
      numPages,
      currentPage: currentPageRef.current,
      ancestorTransforms,
    };
  }, [scrollContainerRef, numPages, currentPageRef]);

  const logScrollDiagnostics = useCallback(() => {
    console.info("[PdfViewer] scroll diagnostics", getScrollDiagnostics());
  }, [getScrollDiagnostics]);

  return { getScrollDiagnostics, logScrollDiagnostics };
}




