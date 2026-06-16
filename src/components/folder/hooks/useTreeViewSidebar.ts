import { useCallback, useEffect, useRef, useState } from "react";
import { WEB_STORAGE_KEYS } from "@platform/storage/webStorageKeys.constants";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTreeViewSidebarHotkey } from "@/features/hotkey/useTreeViewSidebarHotkey";



const TREE_VIEW_SIDEBAR_TOGGLE_EVENT = "sivflow:treeview-sidebar-toggle";
const SIDEBAR_WIDTH_LIMITS = {
  min: 260,
  max: 320,
  default: 292,
} as const;
const SECTION_LIST_PANE_LEFT_VAR = "--sivflow-section-list-pane-left";



const clampSidebarWidth = (width: number) =>
  Math.min(Math.max(width, SIDEBAR_WIDTH_LIMITS.min), SIDEBAR_WIDTH_LIMITS.max);
const publishSectionListPaneLeft = (width: number) => {
  if (typeof document === "undefined") {
    return;
  }

  const nextWidth = Math.max(0, Math.round(width));
  document.documentElement.style.setProperty(
    SECTION_LIST_PANE_LEFT_VAR,
    `${nextWidth}px`,
  );
};
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
const useTreeViewSidebar = () => {
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
  const bodyUserSelectRef = useRef("");
  const bodyCursorRef = useRef("");

  const applyRenderedSidebarWidthToDom = useCallback((width: number) => {
    const element = sidebarRef.current;
    const nextWidth = Math.max(0, Math.round(width));
    const cssWidth = `${nextWidth}px`;

    publishSectionListPaneLeft(nextWidth);

    if (!element) {
      return;
    }

    element.style.width = cssWidth;
    element.style.minWidth = cssWidth;
  }, []);

  const toggleSidebarOpen = useCallback(() => {
    setIsSidebarOpen((previousOpen) => {
      const nextOpen = !previousOpen;
      window.localStorage.setItem(
        WEB_STORAGE_KEYS.sidebarOpen,
        String(nextOpen),
      );
      return nextOpen;
    });
  }, []);

  const getCurrentSidebarWidth = useCallback(() => {
    const domWidth = sidebarRef.current?.getBoundingClientRect().width;
    const baseWidth =
      typeof domWidth === "number" && Number.isFinite(domWidth) && domWidth > 0
        ? domWidth
        : sidebarWidth;

    return clampSidebarWidth(baseWidth);
  }, [sidebarWidth]);

  const restoreBodyResizeStyles = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.userSelect = bodyUserSelectRef.current;
    document.body.style.cursor = bodyCursorRef.current;

    bodyUserSelectRef.current = "";
    bodyCursorRef.current = "";
  }, []);

  const scheduleRenderedSidebarWidth = useCallback(
    (nextWidth: number) => {
      pendingWidthRef.current = clampSidebarWidth(nextWidth);

      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;

        applyRenderedSidebarWidthToDom(
          isSidebarOpen ? pendingWidthRef.current : 0,
        );
      });
    },
    [applyRenderedSidebarWidthToDom, isSidebarOpen],
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
    const nextRenderedWidth = isSidebarOpen ? normalizedWidth : 0;

    pendingWidthRef.current = normalizedWidth;
    setRenderedSidebarWidth(nextRenderedWidth);
    applyRenderedSidebarWidthToDom(nextRenderedWidth);
  }, [applyRenderedSidebarWidthToDom, isMobile, isSidebarOpen, sidebarWidth]);

  useEffect(() => {
    window.addEventListener(
      TREE_VIEW_SIDEBAR_TOGGLE_EVENT,
      toggleSidebarOpen,
    );

    return () => {
      window.removeEventListener(
        TREE_VIEW_SIDEBAR_TOGGLE_EVENT,
        toggleSidebarOpen,
      );
    };
  }, [toggleSidebarOpen]);

  useTreeViewSidebarHotkey({ onToggle: toggleSidebarOpen });

  const startResizing = useCallback(
    (event: ReactPointerEvent) => {
      if (!isSidebarOpen || isMobile) {
        return;
      }

      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

      const currentWidth = getCurrentSidebarWidth();

      resizingRef.current = true;
      setIsResizing(true);

      startXRef.current = event.clientX;
      startWidthRef.current = currentWidth;
      pendingWidthRef.current = currentWidth;
      applyRenderedSidebarWidthToDom(currentWidth);

      bodyUserSelectRef.current = document.body.style.userSelect;
      bodyCursorRef.current = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [
      applyRenderedSidebarWidthToDom,
      getCurrentSidebarWidth,
      isMobile,
      isSidebarOpen,
    ],
  );

  const stopResizing = useCallback(() => {
    if (!resizingRef.current) {
      return;
    }

    resizingRef.current = false;
    setIsResizing(false);

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    restoreBodyResizeStyles();

    const finalWidth = clampSidebarWidth(pendingWidthRef.current);
    const nextRenderedWidth = isSidebarOpen ? finalWidth : 0;

    setSidebarWidth(finalWidth);
    setRenderedSidebarWidth(nextRenderedWidth);
    applyRenderedSidebarWidthToDom(nextRenderedWidth);
    window.localStorage.setItem(
      WEB_STORAGE_KEYS.sidebarWidth,
      String(finalWidth),
    );
  }, [applyRenderedSidebarWidthToDom, isSidebarOpen, restoreBodyResizeStyles]);

  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
      if (!resizingRef.current) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - startXRef.current;
      scheduleRenderedSidebarWidth(startWidthRef.current + deltaX);
    },
    [scheduleRenderedSidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    window.addEventListener("pointermove", handleResizeMove, {
      passive: false,
    });
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

      if (resizingRef.current) {
        resizingRef.current = false;
        restoreBodyResizeStyles();
      }
    };
  }, [restoreBodyResizeStyles]);

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



export { TREE_VIEW_SIDEBAR_TOGGLE_EVENT, useTreeViewSidebar };
