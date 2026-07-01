import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWorkspaceTabsStore } from "./useTabsStore";



type UseWorkspaceTabsRouteSyncOptions = {
  enabled?: boolean;
};



const SETTINGS_ROUTE_TAB_ID = "route:settings" as const;



const closeSettingsTabIfNeeded = (pathname: string) => {
  if (pathname === "/settings") return;

  const { tabs, closeTab } = useWorkspaceTabsStore.getState();
  const hasSettingsTab = tabs.some((tab) => tab.id === SETTINGS_ROUTE_TAB_ID);

  if (hasSettingsTab) {
    closeTab(SETTINGS_ROUTE_TAB_ID);
  }
};
const useWorkspaceTabsRouteSync = ({ enabled = true }: UseWorkspaceTabsRouteSyncOptions = {}) => {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pathname = location.pathname.toLowerCase();

    closeSettingsTabIfNeeded(pathname);

    const {
      activeTabId,
      tabs,
      openSectionTab,
      selectTab,
    } = useWorkspaceTabsStore.getState();

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

    if (pathname === "/study") {
      const nextTabId = openSectionTab("review");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    if (pathname === "/schedule") {
      if (activeTab?.sectionKey === "library") {
        return;
      }

      const nextTabId = openSectionTab("schedule");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    if (pathname === "/settings") {
      const nextTabId = openSectionTab("settings");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }
    }
  }, [enabled, location.pathname]);
};



export { useWorkspaceTabsRouteSync };
