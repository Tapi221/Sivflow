import { useCallback, useEffect, useRef, useState } from "react";
import { SIDEBAR_WIDTH_LIMITS } from "@constants/web/sidebar";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";

const clamp = (w: number) =>
  Math.min(Math.max(w, SIDEBAR_WIDTH_LIMITS.min), SIDEBAR_WIDTH_LIMITS.max);

export const useTreeViewSidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_WIDTH_LIMITS.default;
    const saved = window.localStorage.getItem(WEB_STORAGE_KEYS.sidebarWidth);
    return saved ? parseInt(saved, 10) : SIDEBAR_WIDTH_LIMITS.default;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(WEB_STORAGE_KEYS.sidebarOpen);
    return saved !== null ? saved === "true" : true;
  });

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const pendingWRef = useRef(sidebarWidth);
  const rafIdRef = useRef<number | null>(null);

  const applyWidthDom = useCallback(
    (w: number) => {
      if (isMobile) return;
      pendingWRef.current = clamp(w);

      if (rafIdRef.current != null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const el = sidebarRef.current;
        if (!el) return;
        el.style.width = isSidebarOpen ? `${pendingWRef.current}px` : "0px";
      });
    },
    [isMobile, isSidebarOpen],
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    if (!isMobile) {
      el.style.width = isSidebarOpen ? `${sidebarWidth}px` : "0px";
    } else {
      el.style.width = "";
    }

    pendingWRef.current = sidebarWidth;
  }, [isMobile, isSidebarOpen, sidebarWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        setIsSidebarOpen((prev) => {
          const next = !prev;
          window.localStorage.setItem(WEB_STORAGE_KEYS.sidebarOpen, String(next));
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const startResizing = useCallback(
    (e: React.PointerEvent) => {
      if (!isSidebarOpen) return;
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

      resizingRef.current = true;
      setIsResizing(true);

      startXRef.current = e.clientX;
      startWRef.current = pendingWRef.current;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [isSidebarOpen],
  );

  const stopResizing = useCallback(() => {
    if (!resizingRef.current) return;

    resizingRef.current = false;
    setIsResizing(false);

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    const finalW = pendingWRef.current;
    setSidebarWidth(finalW);
    window.localStorage.setItem(WEB_STORAGE_KEYS.sidebarWidth, String(finalW));
  }, []);

  const onResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!resizingRef.current) return;
      const dx = e.clientX - startXRef.current;
      applyWidthDom(startWRef.current + dx);
    },
    [applyWidthDom],
  );

  useEffect(() => {
    if (!isResizing) return;

    window.addEventListener("pointermove", onResizeMove, { passive: true });
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      window.removeEventListener("pointermove", onResizeMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);

      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
    };
  }, [isResizing, onResizeMove, stopResizing]);

  return {
    sidebarRef,
    contentScrollRef,
    sidebarWidth,
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    isResizing,
    startResizing,
  };
};
