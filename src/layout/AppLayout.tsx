import { Suspense, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarOpenIcon } from "@/components/icons/icons.sidebar";
import { useScheduleScreenStore } from "@/features/calendar/header/useScheduleScreenStore";
import { useHotKeyDesktop } from "@/features/hotkey/useHotKey.desktop";
import { Sidebar } from "@/features/sidebar/Sidebar.desktop";
import { useWorkspaceTabsRouteSync } from "@/features/tab/hooks/useTabsRouteSync";
import { isDesktopRuntime } from "@/platform/runtime";
import "./AppLayout.css";
import { useLayoutRouteStateDesktop } from "./hooks/useLayoutRouteState.desktop";
import { useResetWorkspaceScrollDesktop } from "./hooks/useResetWorkspaceScroll.desktop";
import { WorkspaceShell } from "./WorkspaceShell";

export const AppLayout = () => {
  const { pathname, isFoldersRoute, isScrollLocked } =
    useLayoutRouteStateDesktop();
  const showWorkspaceTabs = isDesktopRuntime();

  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const isDayDetailPanelOpen = useScheduleScreenStore((state) => state.isDayDetailPanelOpen);
  const canToggleDayDetailPanel = useScheduleScreenStore((state) => state.canToggleDayDetailPanel);
  const toggleDayDetailPanel = useScheduleScreenStore((state) => state.toggleDayDetailPanel);

  const mainRef = useRef<HTMLElement | null>(null);

  useWorkspaceTabsRouteSync({ enabled: showWorkspaceTabs });

  useHotKeyDesktop({
    onToggleRightSidebar: () => {
      setIsRightSidebarOpen((current) => !current);
    },
  });

  useResetWorkspaceScrollDesktop({ pathname, mainRef });

  const showScheduleRightSidebarPlaceholder = /^\/schedule(?:\/|$)/i.test(pathname);
  const scheduleRightSidebarToggleLabel = isDayDetailPanelOpen
    ? "日詳細パネルを閉じる"
    : "日詳細パネルを開く";

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

      {showScheduleRightSidebarPlaceholder ? (
        <button
          type="button"
          className="app-layout__schedule-right-sidebar-placeholder"
          onClick={toggleDayDetailPanel}
          disabled={!canToggleDayDetailPanel}
          aria-label={scheduleRightSidebarToggleLabel}
          aria-pressed={isDayDetailPanelOpen}
          aria-expanded={isDayDetailPanelOpen}
        >
          <SidebarOpenIcon className="app-layout__schedule-right-sidebar-placeholder-icon" />
        </button>
      ) : null}

      <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </WorkspaceShell>
    </div>
  );
};