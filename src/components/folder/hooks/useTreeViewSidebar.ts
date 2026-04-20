import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SIDEBAR_WIDTH_LIMITS } from "@constants/web/app";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";

const clampSidebarWidth = (width: number) =>
  Math.min(Math.max(width, SIDEBAR_WIDTH_LIMITS.min), SIDEBAR_WIDTH_LIMITS.max);

const readStoredSidebarWidth = () => {
  if (typeof window === "undefined") {
    return SIDEBAR_WIDTH_LIMITS.default;
  }

  const savedWidth = window.localStorage.getItem(WEB_STORAGE_KEYS.sidebarWidth);
  const parsedWidth = Number.parseInt(savedWidth ?? "", 10);

  if (!Number.isFinite(parsedWidth)) {
    return SIDEBAR_WIDTH_LIMITS.default;
  }

  return clampSidebarWidth(parsedWidth);
};

const readStoredSidebarOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const savedOpen = window.localStorage.getItem(WEB_STORAGE_KEYS.sidebarOpen);
  return savedOpen !== null ? savedOpen === "true" : true;
};

export const useTreeViewSidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const [renderedSidebarWidth, setRenderedSidebarWidth] = useState(() =>
    clampSidebarWidth(readStoredSidebarWidth()),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(readStoredSidebarOpen);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(sidebarWidth);
  const pendingWidthRef = useRef(sidebarWidth);
  const rafIdRef = useRef<number | null>(null);

  const scheduleRenderedSidebarWidth = useCallback(
    (nextWidth: number) => {
      pendingWidthRef.current = clampSidebarWidth(nextWidth);

      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        setRenderedSidebarWidth(isSidebarOpen ? pendingWidthRef.current : 0);
      });
    },
    [isSidebarOpen],
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const normalizedWidth = clampSidebarWidth(sidebarWidth);
    pendingWidthRef.current = normalizedWidth;
    setRenderedSidebarWidth(isSidebarOpen ? normalizedWidth : 0);
  }, [isMobile, isSidebarOpen, sidebarWidth]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        const target = event.target as HTMLElement;

        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        event.preventDefault();

        setIsSidebarOpen((previousOpen) => {
          const nextOpen = !previousOpen;
          window.localStorage.setItem(
            WEB_STORAGE_KEYS.sidebarOpen,
            String(nextOpen),
          );
          return nextOpen;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const startResizing = useCallback(
    (event: ReactPointerEvent) => {
      if (!isSidebarOpen || isMobile) {
        return;
      }

      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

      resizingRef.current = true;
      setIsResizing(true);

      startXRef.current = event.clientX;
      startWidthRef.current = clampSidebarWidth(sidebarWidth);
      pendingWidthRef.current = clampSidebarWidth(sidebarWidth);

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [isMobile, isSidebarOpen, sidebarWidth],
  );

  const stopResizing = useCallback(() => {
    if (!resizingRef.current) {
      return;
    }

    resizingRef.current = false;
    setIsResizing(false);

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    const finalWidth = clampSidebarWidth(pendingWidthRef.current);
    setSidebarWidth(finalWidth);
    setRenderedSidebarWidth(isSidebarOpen ? finalWidth : 0);
    window.localStorage.setItem(
      WEB_STORAGE_KEYS.sidebarWidth,
      String(finalWidth),
    );
  }, [isSidebarOpen]);

  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
      if (!resizingRef.current) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      scheduleRenderedSidebarWidth(startWidthRef.current + deltaX);
    },
    [scheduleRenderedSidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    window.addEventListener("pointermove", handleResizeMove, { passive: true });
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [handleResizeMove, isResizing, stopResizing]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    sidebarRef,
    contentScrollRef,
    sidebarWidth,
    renderedSidebarWidth,
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    isResizing,
    startResizing,
  };
};
