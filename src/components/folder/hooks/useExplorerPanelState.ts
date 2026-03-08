import { useExplorerStore } from "@/hooks/folder/useExplorerStore";

export function useExplorerPanelState() {
  const explorerTab = useExplorerStore((s) => s.explorerTab);
  const setExplorerTab = useExplorerStore((s) => s.setExplorerTab);

  const pinnedItems = useExplorerStore((s) => s.pinnedItems);
  const pinItem = useExplorerStore((s) => s.pinItem);
  const unpinItem = useExplorerStore((s) => s.unpinItem);

  const recent = useExplorerStore((s) => s.recent);
  const addRecent = useExplorerStore((s) => s.addRecent);
  const clearRecent = useExplorerStore((s) => s.clearRecent);

  const tagFilter = useExplorerStore((s) => s.tagFilter);
  const tagMatchMode = useExplorerStore((s) => s.tagMatchMode);
  const uncertaintyFilter = useExplorerStore((s) => s.uncertaintyFilter);
  const bookmarkedFilter = useExplorerStore((s) => s.bookmarkedFilter);
  const draftFilter = useExplorerStore((s) => s.draftFilter);
  const contentTypeFilter = useExplorerStore((s) => s.contentTypeFilter);

  return {
    explorerTab,
    setExplorerTab,
    pinnedItems,
    pinItem,
    unpinItem,
    recent,
    addRecent,
    clearRecent,
    tagFilter,
    tagMatchMode,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
  };
}

