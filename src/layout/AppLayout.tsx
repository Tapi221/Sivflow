import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { useWorkspaceTabsRouteSync } from "@/pane.desktop/tab.desktopnative/hooks/useTabsRouteSync";
import { useLayoutRouteStateDesktop } from "@/layout/hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "@/layout/hooks/useResetWorkspaceScroll.desktop";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";
import { isDesktopRuntime } from "@/platform/runtime";
import "@/styles/backpane.css";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

const DESKTOP_SIDEBAR_MEDIA_QUERY = "(min-width: 768px)";

const getShouldRenderDesktopSidebar = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;

  return window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY).matches;
};

const useShouldRenderDesktopSidebar = () => {
  const [shouldRenderDesktopSidebar, setShouldRenderDesktopSidebar] = useState(getShouldRenderDesktopSidebar);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQueryList = window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY);
    const updateShouldRenderDesktopSidebar = () => {
      setShouldRenderDesktopSidebar(mediaQueryList.matches);
    };

    updateShouldRenderDesktopSidebar();
    mediaQueryList.addEventListener("change", updateShouldRenderDesktopSidebar);

    return () => {
      mediaQueryList.removeEventListener("change", updateShouldRenderDesktopSidebar);
    };
  }, []);

  return shouldRenderDesktopSidebar;
};

export const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();
  const showWorkspaceTabs = isDesktopRuntime();
  const shouldRenderDesktopSidebar = useShouldRenderDesktopSidebar();
  const shouldShowRightSidebar = shouldRenderDesktopSidebar && isDesktopRuntime();

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
    shouldRenderDesktopSidebar ? "" : "app-layout--without-sidebar",
    shouldRenderDesktopSidebar && isSidebarClosed ? "app-layout--sidebar-closed" : "",
    shouldShowRightSidebar && isRightSidebarOpen ? "app-layout--right-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      {shouldRenderDesktopSidebar && (
        <Sidebar
          isClosed={isSidebarClosed}
          onToggleClosed={() => setIsSidebarClosed((current) => !current)}
        />
      )}

      <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </WorkspaceShell>
    </div>
  );
};
