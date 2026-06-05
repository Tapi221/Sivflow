import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { Search } from "@/ui/icons";
import "@/styles/backpane.css";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

type AppLayoutOutletContext = {
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
};

type ScrollElementSnapshot = {
  element: HTMLElement;
  scrollLeft: number;
  scrollTop: number;
};

type ScrollPositionSnapshot = {
  bodyScrollLeft: number;
  bodyScrollTop: number;
  documentElementScrollLeft: number;
  documentElementScrollTop: number;
  elements: ScrollElementSnapshot[];
  windowScrollLeft: number;
  windowScrollTop: number;
};

const GLOBAL_SEARCH_TRIGGER_CLASS_NAME = "absolute right-5 top-4 z-30 flex h-9 w-[268px] shrink-0 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-left text-[13px] font-medium leading-none text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#d7dbe2] hover:bg-[#fbfbfc] focus:outline-none focus:ring-0 focus-visible:border-[#c7d2fe] focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]";
const GLOBAL_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-[22px] min-w-[34px] items-center justify-center rounded-[6px] border border-[#e6e6e8] bg-[#f7f7f8] px-1.5 text-[11px] font-semibold leading-none tracking-[-0.02em] text-[#8e8e93] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const LEFT_PANEL_COLLAPSED_STORAGE_VALUE = "collapsed";

const readStoredLeftPanelCollapsed = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY) === LEFT_PANEL_COLLAPSED_STORAGE_VALUE;
  } catch {
    return false;
  }
};

const persistLeftPanelCollapsed = (isCollapsed: boolean) => {
  if (typeof window === "undefined") return;

  try {
    if (isCollapsed) {
      window.localStorage.setItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY, LEFT_PANEL_COLLAPSED_STORAGE_VALUE);
      return;
    }

    window.localStorage.removeItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY);
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};

const isScrollableElement = (element: HTMLElement): boolean => {
  return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
};

const collectScrollElements = (root: HTMLElement | null): HTMLElement[] => {
  if (typeof document === "undefined") return [];

  const elements = new Set<HTMLElement>([document.documentElement, document.body]);

  if (root) {
    elements.add(root);
    root.querySelectorAll<HTMLElement>("*").forEach((element) => {
      if (isScrollableElement(element)) elements.add(element);
    });
  }

  return [...elements];
};

const createScrollPositionSnapshot = (root: HTMLElement | null): ScrollPositionSnapshot | null => {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  return {
    bodyScrollLeft: document.body.scrollLeft,
    bodyScrollTop: document.body.scrollTop,
    documentElementScrollLeft: document.documentElement.scrollLeft,
    documentElementScrollTop: document.documentElement.scrollTop,
    elements: collectScrollElements(root).map((element) => ({ element, scrollLeft: element.scrollLeft, scrollTop: element.scrollTop })),
    windowScrollLeft: window.scrollX,
    windowScrollTop: window.scrollY,
  };
};

const restoreScrollPositionSnapshot = (snapshot: ScrollPositionSnapshot) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  snapshot.elements.forEach(({ element, scrollLeft, scrollTop }) => {
    if (element !== document.documentElement && element !== document.body && !document.contains(element)) return;

    element.scrollLeft = scrollLeft;
    element.scrollTop = scrollTop;
  });

  document.documentElement.scrollLeft = snapshot.documentElementScrollLeft;
  document.documentElement.scrollTop = snapshot.documentElementScrollTop;
  document.body.scrollLeft = snapshot.bodyScrollLeft;
  document.body.scrollTop = snapshot.bodyScrollTop;
  window.scrollTo({ left: snapshot.windowScrollLeft, top: snapshot.windowScrollTop, behavior: "auto" });
};

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScheduleRoute, isScrollLocked } = useLayoutRouteStateDesktop();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(readStoredLeftPanelCollapsed);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const openSearch = useSearchStore((state) => state.open);
  const mainRef = useRef<HTMLElement | null>(null);
  const scrollPositionSnapshotRef = useRef<ScrollPositionSnapshot | null>(null);
  const handleOpenSearch = useCallback(() => openSearch(), [openSearch]);
  const captureScrollPosition = useCallback(() => {
    scrollPositionSnapshotRef.current = createScrollPositionSnapshot(mainRef.current);
  }, []);
  const handleToggleLeftPanel = useCallback(() => {
    captureScrollPosition();
    setIsLeftPanelCollapsed((current) => !current);
  }, [captureScrollPosition]);
  const handleToggleRightSidebar = useCallback(() => {
    captureScrollPosition();
    setIsRightSidebarOpen((current) => !current);
  }, [captureScrollPosition]);
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onToggleLeftPanel: handleToggleLeftPanel }), [handleToggleLeftPanel, isLeftPanelCollapsed]);
  const showGlobalSearchTrigger = !isScheduleRoute;

  useEffect(() => {
    persistLeftPanelCollapsed(isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed]);

  useLayoutEffect(() => {
    const snapshot = scrollPositionSnapshotRef.current;
    if (!snapshot) return undefined;

    let secondAnimationFrameId = 0;
    restoreScrollPositionSnapshot(snapshot);

    const firstAnimationFrameId = window.requestAnimationFrame(() => {
      restoreScrollPositionSnapshot(snapshot);
      secondAnimationFrameId = window.requestAnimationFrame(() => {
        restoreScrollPositionSnapshot(snapshot);
        if (scrollPositionSnapshotRef.current === snapshot) scrollPositionSnapshotRef.current = null;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstAnimationFrameId);
      if (secondAnimationFrameId) window.cancelAnimationFrame(secondAnimationFrameId);
    };
  }, [isLeftPanelCollapsed, isRightSidebarOpen]);

  useHotKeyDesktop({
    onToggleRightSidebar: handleToggleRightSidebar,
  });

  useResetWorkspaceScrollDesktop({ pathname, mainRef });

  const className = [
    "app-layout",
    isFoldersRoute ? "app-layout--folders" : "",
    isScrollLocked ? "app-layout--scroll-locked" : "",
    isLeftPanelCollapsed ? "app-layout--left-panel-collapsed" : "",
    isRightSidebarOpen ? "app-layout--right-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
        <Suspense fallback={null}>
          <Outlet context={outletContext} />
        </Suspense>
      </WorkspaceShell>

      {showGlobalSearchTrigger && (
        <button type="button" className={GLOBAL_SEARCH_TRIGGER_CLASS_NAME} aria-label="検索を開く" aria-keyshortcuts="Meta+K Control+K" title="検索を開く" onClick={handleOpenSearch}>
          <Search className="h-4 w-4 shrink-0 text-[#8e8e93]" />
          <span className="min-w-0 truncate text-[#7a7f88]">Search in Workspace...</span>
          <kbd className={GLOBAL_SEARCH_SHORTCUT_CLASS_NAME}>⌘K</kbd>
        </button>
      )}
    </div>
  );
};

export { AppLayout, type AppLayoutOutletContext };
