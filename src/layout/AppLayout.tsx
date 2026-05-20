import { Suspense, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { SettingDialog } from "@/features/settings/SettingDialog.desktop";
import { Sidebar } from "@/features/sidebar/Sidebar.desktop";
import { useWorkspaceTabsRouteSync } from "@/features/tab/hooks/useTabsRouteSync";

import "./AppLayout.css";

import { useLayoutRouteStateDesktop } from "./hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "./hooks/useResetWorkspaceScroll.desktop";
import { WorkspaceShell } from "./WorkspaceShell";

export const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);

  useWorkspaceTabsRouteSync();

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
    isRightSidebarOpen ? "app-layout--right-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={className}>
        <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

        <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </WorkspaceShell>
      </div>

      <SettingDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
};