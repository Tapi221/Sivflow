import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { mapExplorerSelectionToSearchParams } from "@/features/explorer/mappers/mapExplorerSelectionToSearchParams";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import type { WorkspaceExplorerTab } from "@/features/tab/Tab";

const normalizeQuery = (search: string) => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  return params.toString();
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

export const useWorkspaceTabsRouteSync = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(location.search);
    const normalizedSearch = normalizeQuery(location.search);

    const {
      activeTabId,
      openSectionTab,
      selectTab,
      openExplorerTab,
      openDocumentTab,
      openCardTab,
      openCardSetTab,
    } = useWorkspaceTabsStore.getState();

    if (pathname === "/study") {
      const nextTabId = openSectionTab("review");

      if (activeTabId !== nextTabId) {
        selectTab(nextTabId);
      }

      return;
    }

    if (pathname === "/schedule") {
      const nextTabId = openSectionTab("calendar");

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

    if (pathname === "/tag-map") {
      return;
    }

    if (pathname !== "/folders") {
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
  }, [location.pathname, location.search]);
};