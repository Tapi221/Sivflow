import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import "@/styles/backpane.css";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

type AppLayoutOutletContext = {
  isLeftPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
};

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

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(readStoredLeftPanelCollapsed);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const handleToggleLeftPanel = useCallback(() => setIsLeftPanelCollapsed((current) => !current), []);
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onToggleLeftPanel: handleToggleLeftPanel }), [handleToggleLeftPanel, isLeftPanelCollapsed]);

  useEffect(() => {
    persistLeftPanelCollapsed(isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed]);

  useHotKeyDesktop({
    onToggleRightSidebar: () => {
      setIsRightSidebarOpen((current) => !current);
    },
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
    </div>
  );
};

export { AppLayout, type AppLayoutOutletContext };
