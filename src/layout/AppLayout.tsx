import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { WorkspaceLayoutRevisionProvider } from "./WorkspaceLayoutRevisionContext";
import { Search } from "@/ui/icons";
import "@/styles/backpane.css";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

type AppLayoutOutletContext = {
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
};

const GLOBAL_SEARCH_TRIGGER_CLASS_NAME = "absolute right-5 top-4 z-30 flex h-9 w-[268px] shrink-0 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-left text-[13px] font-medium leading-none text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#d7dbe2] hover:bg-[#fbfbfc] focus:outline-none focus:ring-0 focus-visible:border-[#c7d2fe] focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]";
const GLOBAL_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-[22px] min-w-[34px] items-center justify-center rounded-[6px] border border-[#e6e6e8] bg-[#f7f7f8] px-1.5 text-[11px] font-semibold leading-none tracking-[-0.02em] text-[#8e8e93] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const LEFT_PANEL_COLLAPSED_STORAGE_VALUE = "collapsed";
const MOBILE_SCHEDULE_SIDEBAR_SELECTOR = "#mobile-schedule-sidebar";
const MOBILE_SCHEDULE_SIDEBAR_TOGGLE_SELECTOR = ".app-layered-directory__workspace-toggle";
const MOBILE_SCHEDULE_SIDEBAR_CLOSE_BUTTON_SELECTOR = 'button[aria-label="サイドバーを閉じる"]';

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

const getMobileScheduleSidebarCloseButton = (target: EventTarget | null): HTMLButtonElement | null => {
  if (!(target instanceof Element)) return null;
  if (!target.closest(MOBILE_SCHEDULE_SIDEBAR_TOGGLE_SELECTOR)) return null;

  const mobileScheduleSidebar = target.closest(MOBILE_SCHEDULE_SIDEBAR_SELECTOR);
  return mobileScheduleSidebar?.parentElement?.querySelector<HTMLButtonElement>(MOBILE_SCHEDULE_SIDEBAR_CLOSE_BUTTON_SELECTOR) ?? null;
};

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScheduleRoute, isScrollLocked } = useLayoutRouteStateDesktop();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(readStoredLeftPanelCollapsed);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [workspaceLayoutRevision, setWorkspaceLayoutRevision] = useState(0);

  const openSearch = useSearchStore((state) => state.open);
  const mainRef = useRef<HTMLElement | null>(null);
  const handleOpenSearch = useCallback(() => openSearch(), [openSearch]);
  const bumpWorkspaceLayoutRevision = useCallback(() => {
    setWorkspaceLayoutRevision((current) => current + 1);
  }, []);
  const handleToggleLeftPanel = useCallback(() => {
    bumpWorkspaceLayoutRevision();
    setIsLeftPanelCollapsed((current) => !current);
  }, [bumpWorkspaceLayoutRevision]);
  const handleToggleRightSidebar = useCallback(() => {
    bumpWorkspaceLayoutRevision();
    setIsRightSidebarOpen((current) => !current);
  }, [bumpWorkspaceLayoutRevision]);
  const handleMobileScheduleSidebarToggle = useCallback((event: MouseEvent) => {
    const closeButton = getMobileScheduleSidebarCloseButton(event.target);
    if (!closeButton) return;

    event.preventDefault();
    event.stopPropagation();
    closeButton.click();
  }, []);
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onToggleLeftPanel: handleToggleLeftPanel }), [handleToggleLeftPanel, isLeftPanelCollapsed]);
  const showGlobalSearchTrigger = !isScheduleRoute;

  useEffect(() => {
    persistLeftPanelCollapsed(isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed]);

  useEffect(() => {
    document.addEventListener("click", handleMobileScheduleSidebarToggle, true);

    return () => {
      document.removeEventListener("click", handleMobileScheduleSidebarToggle, true);
    };
  }, [handleMobileScheduleSidebarToggle]);

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
    <WorkspaceLayoutRevisionProvider revision={workspaceLayoutRevision}>
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
    </WorkspaceLayoutRevisionProvider>
  );
};

export { AppLayout, type AppLayoutOutletContext };