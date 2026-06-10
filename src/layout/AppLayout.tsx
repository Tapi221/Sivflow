import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { SettingsWorkspaceDialog } from "@/features/settings/SettingsWorkspaceDialog";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { Search } from "@/ui/icons";
import "@/styles/backpane.css";
import { WorkspaceLayoutRevisionProvider } from "./WorkspaceLayoutRevisionContext";
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
const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "sivflow:layout:left-panel-collapsed";
const LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const LEFT_PANEL_COLLAPSED_STORAGE_VALUE = "collapsed";
const MOBILE_CALENDAR_SIDEBAR_SELECTOR = "#mobile-calendar-sidebar";
const MOBILE_CALENDAR_SIDEBAR_TOGGLE_SELECTOR = ".app-layered-directory__workspace-toggle";
const MOBILE_CALENDAR_SIDEBAR_CLOSE_BUTTON_SELECTOR = 'button[aria-label="サイドバーを閉じる"]';
const MOBILE_SETTINGS_ROUTE_MEDIA_QUERY = "(max-width: 767px)";
const SIDEBAR_LONG_PRESS_CONTEXT_MENU_TARGET_SELECTOR = ".app-layered-directory [role='treeitem']";
const SIDEBAR_LONG_PRESS_DELAY_MS = 520;
const SIDEBAR_LONG_PRESS_MOVE_TOLERANCE_PX = 10;

const readStoredLeftPanelCollapsed = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const stored = window.localStorage.getItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY);
    if (stored === LEFT_PANEL_COLLAPSED_STORAGE_VALUE) return true;

    const legacyStored = window.localStorage.getItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY);
    if (legacyStored !== LEFT_PANEL_COLLAPSED_STORAGE_VALUE) return false;

    window.localStorage.setItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY, LEFT_PANEL_COLLAPSED_STORAGE_VALUE);
    window.localStorage.removeItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

const readIsMobileSettingsRouteViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_SETTINGS_ROUTE_MEDIA_QUERY).matches;
};

const persistLeftPanelCollapsed = (isCollapsed: boolean) => {
  if (typeof window === "undefined") return;

  try {
    if (isCollapsed) {
      window.localStorage.setItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY, LEFT_PANEL_COLLAPSED_STORAGE_VALUE);
      window.localStorage.removeItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY);
      return;
    }

    window.localStorage.removeItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY);
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};

const getMobileCalendarSidebarCloseButton = (target: EventTarget | null): HTMLButtonElement | null => {
  if (!(target instanceof Element)) return null;
  if (!target.closest(MOBILE_CALENDAR_SIDEBAR_TOGGLE_SELECTOR)) return null;

  const mobileCalendarSidebar = target.closest(MOBILE_CALENDAR_SIDEBAR_SELECTOR);
  return mobileCalendarSidebar?.parentElement?.querySelector<HTMLButtonElement>(MOBILE_CALENDAR_SIDEBAR_CLOSE_BUTTON_SELECTOR) ?? null;
};

const getSidebarLongPressContextMenuTarget = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLElement>(SIDEBAR_LONG_PRESS_CONTEXT_MENU_TARGET_SELECTOR);
};

const isSidebarLongPressPointerEvent = (event: PointerEvent): boolean => (event.pointerType === "touch" || event.pointerType === "pen") && event.button === 0;

const getSidebarLongPressPointerDistance = (event: PointerEvent, state: SidebarLongPressState): number => Math.hypot(event.clientX - state.clientX, event.clientY - state.clientY);

const useIsMobileSettingsRouteViewport = (): boolean => {
  const [isMobileSettingsRouteViewport, setIsMobileSettingsRouteViewport] = useState(readIsMobileSettingsRouteViewport);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_SETTINGS_ROUTE_MEDIA_QUERY);
    const handleChange = () => setIsMobileSettingsRouteViewport(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobileSettingsRouteViewport;
};

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScheduleRoute, isScrollLocked } = useLayoutRouteStateDesktop();
  const navigate = useNavigate();
  const isMobileSettingsRouteViewport = useIsMobileSettingsRouteViewport();
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
    if (isMobileSettingsRouteViewport) {
      setIsSettingsDialogOpen(false);
      navigate("/settings");
      return;
    }

    setIsSettingsDialogOpen(true);
  }, [isMobileSettingsRouteViewport, navigate]);

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

  const handleSuppressSidebarLongPressClick = useCallback((event: MouseEvent) => {
    if (!shouldSuppressSidebarLongPressClickRef.current) return;
    shouldSuppressSidebarLongPressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    persistLeftPanelCollapsed(isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    main.addEventListener("pointerdown", handleSidebarLongPressPointerDown, true);
    main.addEventListener("pointermove", handleSidebarLongPressPointerMove, true);
    main.addEventListener("pointerup", handleSidebarLongPressPointerEnd, true);
    main.addEventListener("pointercancel", handleSidebarLongPressPointerEnd, true);
    main.addEventListener("click", handleSuppressSidebarLongPressClick, true);

    return () => {
      main.removeEventListener("pointerdown", handleSidebarLongPressPointerDown, true);
      main.removeEventListener("pointermove", handleSidebarLongPressPointerMove, true);
      main.removeEventListener("pointerup", handleSidebarLongPressPointerEnd, true);
      main.removeEventListener("pointercancel", handleSidebarLongPressPointerEnd, true);
      main.removeEventListener("click", handleSuppressSidebarLongPressClick, true);
      clearSidebarLongPress();
    };
  }, [clearSidebarLongPress, handleSidebarLongPressPointerDown, handleSidebarLongPressPointerEnd, handleSidebarLongPressPointerMove, handleSuppressSidebarLongPressClick]);

  useResetWorkspaceScrollDesktop(mainRef, pathname);

  const isRightSidebarVisible = isScheduleRoute && isRightSidebarOpen;
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onOpenSettings: handleOpenSettings, onToggleLeftPanel: handleToggleLeftPanel }), [handleOpenSettings, handleToggleLeftPanel, isLeftPanelCollapsed]);

  return (
    <WorkspaceLayoutRevisionProvider value={workspaceLayoutRevision}>
      <WorkspaceShell isLeftPanelCollapsed={isLeftPanelCollapsed} isRightSidebarVisible={isRightSidebarVisible} isFoldersRoute={isFoldersRoute} isScheduleRoute={isScheduleRoute} isScrollLocked={isScrollLocked} mainRef={mainRef} onOpenSettings={handleOpenSettings} onToggleLeftPanel={handleToggleLeftPanel} onToggleRightSidebar={handleToggleRightSidebar}>
        <button type="button" className={GLOBAL_SEARCH_TRIGGER_CLASS_NAME} onClick={handleOpenSearch} aria-label="検索を開く">
          <Search size={16} />
          <span>検索</span>
          <span className={GLOBAL_SEARCH_SHORTCUT_CLASS_NAME}>⌘K</span>
        </button>
        <Suspense fallback={null}>
          <Outlet context={outletContext} />
        </Suspense>
        <SettingsWorkspaceDialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />
      </WorkspaceShell>
    </WorkspaceLayoutRevisionProvider>
  );
};

export { AppLayout };
