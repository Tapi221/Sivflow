import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import type { WorkspaceExplorerTab } from "@/features/tab/Tab";

const SETTINGS_ROUTE_TAB_ID = "route:settings" as const;

type UseWorkspaceTabsRouteSyncOptions = {
  enabled?: boolean;
};

const normalizeQuery = (search: string) => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  return params.toString();
};

const closeSettingsTabIfNeeded = (pathname: string) => {
  if (pathname === "/settings") return;

  const { tabs, closeTab } = useWorkspaceTabsStore.getState();
  const hasSettingsTab = tabs.some((tab) => tab.id === SETTINGS_ROUTE_TAB_ID);

  if (hasSettingsTab) {
    closeTab(SETTINGS_ROUTE_TAB_ID);
  }
};

const resolveExplorerTabIdBySearch = (
  normalizedSearch: string,
): WorkspaceExplorerTab["id"] | null => {
  const tabs = useWorkspaceTabsStore.getState().tabs;

  for (const tab of tabs) {
    if (tab.kind !== "explorer") {
      continue;
    }

    const searchParams = mapExplorerSelectionToSearchParams({
      isHomeOnlyMode: tab.explorerState.isHomeOnlyMode,
      isSectionListMode: tab.explorerState.isSectionListMode,
      selectedFolderId: tab.explorerState.selectedFolderId,
      selectedItem: tab.explorerState.selectedItem,
    });

    if (searchParams.toString() === normalizedSearch) {
      return tab.id;
    }
  }

  return null;
};

export const useWorkspaceTabsRouteSync = ({
  enabled = true,
}: UseWorkspaceTabsRouteSyncOptions = {}) => {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pathname = location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const normalizedSearch = normalizeQuery(location.search);

    closeSettingsTabIfNeeded(pathname);

    const {
      activeTabId,
      openSectionTab,
      selectTab,
      openExplorerTab,
      openDocumentTab,
      openCardTab,
    } = useWorkspaceTabsStore.getState();

    if (pathname === "/study") {
      const nextTabId = openSectionTab("review");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    if (pathname === "/schedule") {
      const nextTabId = openSectionTab("schedule");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    if (pathname === "/tasks") {
      const nextTabId = openSectionTab("tasks");

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

      return;
    }

    if (pathname !== "/library") {
      return;
    }

    if (searchParams.get("home") === "1") {
      const nextTabId = openSectionTab("home");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    const documentId = searchParams.get("docId");

    if (documentId) {
      const nextTabId = openDocumentTab({
        documentId,
        title: "PDF",
        folderId: null,
      });

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    const cardId = searchParams.get("cardId");

    if (cardId) {
      const nextTabId = openCardTab({
        cardId,
        title: "カード",
        folderId: null,
      });

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    const matchedExplorerTabId = resolveExplorerTabIdBySearch(normalizedSearch);

    if (matchedExplorerTabId) {
      if (activeTabId !== matchedExplorerTabId) {
        selectTab(matchedExplorerTabId);
      }

      return;
    }

    const nextTabId = openExplorerTab();

    if (activeTabId !== nextTabId) {
      selectTab(nextTabId);
    }
  }, [enabled, location.pathname, location.search]);
};
