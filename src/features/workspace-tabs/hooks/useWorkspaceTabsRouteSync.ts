import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import {
  WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
  type WorkspaceExplorerTab,
  type WorkspaceTab,
} from "@/features/workspace-tabs/domain/workspaceTab";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";

const normalizeQuery = (search: string) => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.toString();
};

const resolveExplorerTabIdBySearch = (
  tabs: WorkspaceTab[],
  normalizedSearch: string,
): WorkspaceExplorerTab["id"] | null => {
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

export const useWorkspaceTabsRouteSync = () => {
  const location = useLocation();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const selectTab = useWorkspaceTabsStore((state) => state.selectTab);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openDocumentTab = useWorkspaceTabsStore((state) => state.openDocumentTab);
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);
  const openCardSetTab = useWorkspaceTabsStore((state) => state.openCardSetTab);

  useEffect(() => {
    const pathname = location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const normalizedSearch = normalizeQuery(location.search);

    if (pathname === "/gallery") {
      if (activeTabId !== "route:review") {
        selectTab("route:review");
      }
      return;
    }

    if (pathname === "/calendar") {
      if (activeTabId !== "route:calendar") {
        selectTab("route:calendar");
      }
      return;
    }

    if (pathname === "/tag-map") {
      if (activeTabId !== "route:explore") {
        selectTab("route:explore");
      }
      return;
    }

    if (pathname !== "/folders") {
      return;
    }

    if (searchParams.get("home") === "1") {
      if (activeTabId !== "route:home") {
        selectTab("route:home");
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

    const cardSetId = searchParams.get("cardSetId");
    if (cardSetId) {
      const nextTabId = openCardSetTab({
        cardSetId,
        title: "カードセット",
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

    const matchedExplorerTabId = resolveExplorerTabIdBySearch(tabs, normalizedSearch);

    if (matchedExplorerTabId) {
      if (activeTabId !== matchedExplorerTabId) {
        selectTab(matchedExplorerTabId);
      }
      return;
    }

    const nextTabId = openExplorerTab({
      id: WORKSPACE_DEFAULT_EXPLORER_TAB_ID,
    });

    if (activeTabId !== nextTabId) {
      selectTab(nextTabId);
    }
  }, [
    activeTabId,
    location.pathname,
    location.search,
    openCardSetTab,
    openCardTab,
    openDocumentTab,
    openExplorerTab,
    selectTab,
    tabs,
  ]);
};
