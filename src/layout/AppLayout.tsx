import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { SettingsWorkspaceDialog } from "@/features/settings/SettingsWorkspaceDialog";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { WorkspaceLayoutRevisionProvider } from "./WorkspaceLayoutRevisionContext";
import { Search } from "@/ui/icons";
import "@/styles/backpane.css";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

type AppLayoutOutletContext = {
  isLeftPanelCollapsed: boolean;
  onOpenSettings: () => void;
  onToggleLeftPanel: () => void;
};

type SidebarLongPressState = {
  pointerId: number;
  target: HTMLElement;
  clientX: number;
  clientY: number;
  timerId: number;
};

const GLOBAL_SEARCH_TRIGGER_CLASS_NAME = "absolute right-5 top-4 z-30 hidden h-9 w-[268px] shrink-0 items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-left text-[13px] font-medium leading-none text-[#8e8e93] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none ring-0 transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-[#d7dbe2] hover:bg-[#fbfbfc] focus:outline-none focus:ring-0 focus-visible:border-[#c7d2fe] focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] md:flex";
const GLOBAL_SEARCH_SHORTCUT_CLASS_NAME = "ml-auto flex h-[22px] min-w-[34px] items-center justify-center rounded-[6px] border border-[#e6e6e8] bg-[#f7f7f8] px-1.5 text-[11px] font-semibold leading-none tracking-[-0.02em] text-[#8e8e93] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]";
const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const LEFT_PANEL_COLLAPSED_STORAGE_VALUE = "collapsed";
const MOBILE_SCHEDULE_SIDEBAR_SELECTOR = "#mobile-schedule-sidebar";
const MOBILE_SCHEDULE_SIDEBAR_TOGGLE_SELECTOR = ".app-layered-directory__workspace-toggle";
const MOBILE_SCHEDULE_SIDEBAR_CLOSE_BUTTON_SELECTOR = 'button[aria-label="サイドバーを閉じる"]';
const SIDEBAR_LONG_PRESS_CONTEXT_MENU_TARGET_SELECTOR = ".app-layered-directory [role='treeitem']";
const SIDEBAR_LONG_PRESS_DELAY_MS = 520;
const SIDEBAR_LONG_PRESS_MOVE_TOLERANCE_PX = 10;

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

const getSidebarLongPressContextMenuTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLElement>(SIDEBAR_LONG_PRESS_CONTEXT_MENU_TARGET_SELECTOR);
};

const isSidebarLongPressPointerEvent = (event: PointerEvent): boolean => (event.pointerType === "touch" || event.pointerType === "pen") && event.button === 0;

const getSidebarLongPressPointerDistance = (event: PointerEvent, state: SidebarLongPressState): number => Math.hypot(event.clientX - state.clientX, event.clientY - state.clientY);

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScheduleRoute, isScrollLocked } = useLayoutRouteStateDesktop();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(readStoredLeftPanelCollapsed);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [workspaceLayoutRevision, setWorkspaceLayoutRevision] = useState(0);

  const openSearch = useSearchStore((state) => state.open);
  const mainRef = useRef<HTMLElement | null>(null);
  const sidebarLongPressStateRef = useRef<SidebarLongPressState | null>(null);
  const shouldSuppressSidebarLongPressClickRef = useRef(false);
  const handleOpenSearch = useCallback(() => openSearch(), [openSearch]);
  const handleOpenSettings = useCallback(() => {
    setIsSettingsDialogOpen(true);
  }, []);
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
  const clearSidebarLongPress = useCallback(() => {
    const state = sidebarLongPressStateRef.current;
    if (!state) return;

    window.clearTimeout(state.timerId);
    sidebarLongPressStateRef.current = null;
  }, []);
  const handleSidebarLongPressPointerDown = useCallback((event: PointerEvent) => {
    if (!isSidebarLongPressPointerEvent(event)) return;

    const target = getSidebarLongPressContextMenuTarget(event.target);
    if (!target) return;

    clearSidebarLongPress();

    const state: SidebarLongPressState = {
      pointerId: event.pointerId,
      target,
      clientX: event.clientX,
      clientY: event.clientY,
      timerId: window.setTimeout(() => {
        const current = sidebarLongPressStateRef.current;
        if (!current) return;

        shouldSuppressSidebarLongPressClickRef.current = true;
        current.target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, buttons: 0, clientX: current.clientX, clientY: current.clientY, view: window }));
        clearSidebarLongPress();
      }, SIDEBAR_LONG_PRESS_DELAY_MS),
    };

    sidebarLongPressStateRef.current = state;
  }, [clearSidebarLongPress]);
  const handleSidebarLongPressPointerMove = useCallback((event: PointerEvent) => {
    const state = sidebarLongPressStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (getSidebarLongPressPointerDistance(event, state) <= SIDEBAR_LONG_PRESS_MOVE_TOLERANCE_PX) return;

    clearSidebarLongPress();
  }, [clearSidebarLongPress]);
  const handleSidebarLongPressPointerEnd = useCallback((event: PointerEvent) => {
    const state = sidebarLongPressStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    clearSidebarLongPress();
  }, [clearSidebarLongPress]);
  const handleSidebarLongPressClickCapture = useCallback((event: MouseEvent) => {
    if (!shouldSuppressSidebarLongPressClickRef.current) return;

    shouldSuppressSidebarLongPressClickRef.current = false;
    if (!getSidebarLongPressContextMenuTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, []);
  const handleMobileScheduleSidebarToggle = useCallback((event: MouseEvent) => {
    const closeButton = getMobileScheduleSidebarCloseButton(event.target);
    if (!closeButton) return;

    event.preventDefault();
    event.stopPropagation();
    closeButton.click();
  }, []);
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onOpenSettings: handleOpenSettings, onToggleLeftPanel: handleToggleLeftPanel }), [handleOpenSettings, handleToggleLeftPanel, isLeftPanelCollapsed]);
  const showGlobalSearchTrigger = !isScheduleRoute;

  useEffect(() => {
    persistLeftPanelCollapsed(isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed]);

  useEffect(() => {
    document.addEventListener("pointerdown", handleSidebarLongPressPointerDown, true);
    document.addEventListener("pointermove", handleSidebarLongPressPointerMove, true);
    document.addEventListener("pointerup", handleSidebarLongPressPointerEnd, true);
    document.addEventListener("pointercancel", handleSidebarLongPressPointerEnd, true);
    document.addEventListener("click", handleSidebarLongPressClickCapture, true);

    return () => {
      clearSidebarLongPress();
      document.removeEventListener("pointerdown", handleSidebarLongPressPointerDown, true);
      document.removeEventListener("pointermove", handleSidebarLongPressPointerMove, true);
      document.removeEventListener("pointerup", handleSidebarLongPressPointerEnd, true);
      document.removeEventListener("pointercancel", handleSidebarLongPressPointerEnd, true);
      document.removeEventListener("click", handleSidebarLongPressClickCapture, true);
    };
  }, [clearSidebarLongPress, handleSidebarLongPressClickCapture, handleSidebarLongPressPointerDown, handleSidebarLongPressPointerEnd, handleSidebarLongPressPointerMove]);

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

        <SettingsWorkspaceDialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />

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