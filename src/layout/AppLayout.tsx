import { Suspense, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";

import { SettingDialog } from "@/features/settings/SettingDialog";

import { Sidebar } from "@/features/sidebar/Sidebar.desktop";
import { RightSidebarDesktop } from "@/features/sidebar/RightSidebar.desktop";

import { useWorkspaceTabsRouteSync } from "@/features/tab/hooks/useTabsRouteSync";

import { useLayoutRouteStateDesktop } from "./hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "./hooks/useResetWorkspaceScroll.desktop";

import { WorkspaceShell } from "./WorkspaceShell";

import "./AppLayout.css";

const SIDEBAR_COLLAPSE_STORAGE_KEY = "mf.ui.sidebarCollapsed";

export const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY);

      return stored === "1";
    } catch {
      return false;
    }
  });

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);

  useWorkspaceTabsRouteSync();

  useHotKeyDesktop({
    onToggleSidebar: () => {
      setIsSidebarCollapsed((current) => !current);
    },

    onToggleRightSidebar: () => {
      setIsRightSidebarOpen((current) => !current);
    },
  });

  useResetWorkspaceScrollDesktop({
    pathname,
    mainRef,
  });

  return (
    <>
      <div
        className={[
          "app-layout",

          isFoldersRoute ? "app-layout--folders" : "",

          isScrollLocked ? "app-layout--scroll-locked" : "",

          isSidebarCollapsed ? "app-layout--sidebar-collapsed" : "",

          isRightSidebarOpen ? "app-layout--right-sidebar-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Sidebar
          collapsed={isSidebarCollapsed}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </WorkspaceShell>

        <RightSidebarDesktop open={isRightSidebarOpen} />
      </div>

      <SettingDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
};
