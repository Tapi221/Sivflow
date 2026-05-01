import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useWorkspaceTabsRouteSync } from "@/features/workspace-tabs/hooks/useWorkspaceTabsRouteSync";
import { AppSidebar } from "./AppSidebar";
import { WorkspaceShell } from "./WorkspaceShell";
import "./AppLayout.css";

const LoadingFallback = () => {
  return null;
};

const resetWorkspaceScroll = (mainElement: HTMLElement | null) => {
  const containers = document.querySelectorAll<HTMLElement>(
    ".app-layout, .app-layout__content, .app-layout__main",
  );

  containers.forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  if (mainElement) {
    mainElement.scrollTop = 0;
    mainElement.scrollLeft = 0;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export const AppLayout = () => {
  const { pathname } = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(pathname);
  const isCardSetViewRoute = /^\/(?:cardsetview|cardview)(?:\/|$)/i.test(
    pathname,
  );
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(pathname);
  const isStudyRoute = /^\/study(?:\/|$)/i.test(pathname);

  const mainRef = useRef<HTMLElement | null>(null);

  const isScrollLocked =
    isFoldersRoute || isCardEditRoute || isCardSetViewRoute || isStudyRoute;

  useWorkspaceTabsRouteSync();

  useEffect(() => {
    resetWorkspaceScroll(mainRef.current);
  }, [pathname]);

  useEffect(() => {
    const isRightSidebarShortcut = (event: KeyboardEvent) => {
      const key = event.key;
      return (
        key === "\\" ||
        key === "¥" ||
        key === "￥" ||
        event.code === "Backslash" ||
        event.code === "IntlYen"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      const target = event.target;

      if (target instanceof HTMLElement) {
        const isEditable =
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT";

        if (isEditable) {
          return;
        }
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setIsSidebarCollapsed((current) => !current);
        return;
      }

      if (isRightSidebarShortcut(event)) {
        event.preventDefault();
        setIsRightSidebarOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
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
      <AppSidebar />

      <WorkspaceShell isScrollLocked={isScrollLocked} mainRef={mainRef}>
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </WorkspaceShell>

      {isRightSidebarOpen ? (
        <aside className="app-right-sidebar" aria-label="Right sidebar" />
      ) : null}
    </div>
  );
};