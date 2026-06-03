import { Suspense, useMemo, useRef, useState } from "react";
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

const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const handleToggleLeftPanel = () => setIsLeftPanelCollapsed((current) => !current);
  const outletContext = useMemo<AppLayoutOutletContext>(() => ({ isLeftPanelCollapsed, onToggleLeftPanel: handleToggleLeftPanel }), [isLeftPanelCollapsed]);

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
