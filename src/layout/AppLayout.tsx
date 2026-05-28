import { Suspense, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useWorkspaceTabsRouteSync } from "@/pane/tab.desktopnative/hooks/useTabsRouteSync";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { Sidebar } from "@/pane/leftpane/Sidebar.desktop";
import { isDesktopRuntime } from "@/platform/runtime";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

export const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();
  const showWorkspaceTabs = isDesktopRuntime();

  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);

  useWorkspaceTabsRouteSync({ enabled: showWorkspaceTabs });

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
    isSidebarClosed ? "app-layout--sidebar-closed" : "",
    isRightSidebarOpen ? "app-layout--right-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <Sidebar
        isClosed={isSidebarClosed}
        onToggleClosed={() => setIsSidebarClosed((current) => !current)}
      />

      <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </WorkspaceShell>
    </div>
  );
};
