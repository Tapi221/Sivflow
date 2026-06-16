import "@/styles/backpane.css";
import "./AppLayout.css";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsWorkspaceRootPanel } from "@web-renderer/chip/panel/dialog.desktop/Dialog.SettingsWorkspaceRoot";
import { Outlet, useNavigate } from "react-router-dom";
import { useThemeAccentColor } from "@/features/settings/hooks/useThemeAccentColor";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { WorkspaceLayoutRevisionProvider } from "./WorkspaceLayoutRevisionContext";
import { WorkspaceShell } from "./WorkspaceShell";



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



const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "sivflow:layout:left-panel-collapsed";
const LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const MOBILE_SETTINGS_ROUTE_MEDIA_QUERY = "(max-width: 767px)";
const SIDEBAR_LONG_PRESS_CONTEXT_MENU_TARGET_SELECTOR = ".app-layered-directory [role='treeitem']";
const SIDEBAR_LONG_PRESS_DELAY_MS = 520;
const SIDEBAR_LONG_PRESS_MOVE_TOLERANCE_PX = 10;



const clearStoredLeftPanelCollapsed = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY);
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};
const readStoredLeftPanelCollapsed = (): boolean => {
  clearStoredLeftPanelCollapsed();
  return false;
};
const readIsMobileSettingsRouteViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_SETTINGS_ROUTE_MEDIA_QUERY).matches;
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
  useThemeAccentColor();
  const { pathname, isScrollLocked } = useLayoutRouteStateDesktop();
  const navigate = useNavigate();
  const isMobileSettingsRouteViewport = useIsMobileSettingsRouteViewport();
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(readStoredLeftPanelCollapsed);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [workspaceLayoutRevision, setWorkspaceLayoutRevision] = useState(0);
  const mainRef = useRef<HTMLElement | null>(null);
  const sidebarLongPressStateRef = useRef<SidebarLongPressState | null>(null);
  const shouldSuppressSidebarLongPressClickRef = useRef(false);

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
        current.target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: current.clientX, clientY: current.clientY, view: window }));
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
    clearStoredLeftPanelCollapsed();
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

  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onOpenSettings: handleOpenSettings, onToggleLeftPanel: handleToggleLeftPanel }), [handleOpenSettings, handleToggleLeftPanel, isLeftPanelCollapsed]);

  return (
    <div className="app-layout">
      <WorkspaceLayoutRevisionProvider revision={workspaceLayoutRevision}>
        <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
          <Suspense fallback={null}>
            <Outlet context={outletContext} />
          </Suspense>
          <SettingsWorkspaceRootPanel open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />
        </WorkspaceShell>
      </WorkspaceLayoutRevisionProvider>
    </div>
  );
};



export { AppLayout };


export type { AppLayoutOutletContext };
