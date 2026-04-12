import { useEffect, useRef } from "react";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";
import { notifySelectedFolderChanged } from "@/features/explorer/adapters/web/explorerSelectionNotifier";
import type { FoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";
import { useWorkspaceScrollController } from "@/features/explorer/adapters/web/useWorkspaceScrollController";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useExplorerController } from "@/features/explorer/controller/useExplorerController";
import { useExplorerBreadcrumbSync } from "@/features/explorer/hooks/useExplorerBreadcrumbSync";
import { useExplorerFolderSelectionBridge } from "@/features/explorer/hooks/useExplorerFolderSelectionBridge";
import { useExplorerLookups } from "@/features/explorer/hooks/useExplorerLookups";
import { useExplorerRouteSync } from "@/features/explorer/hooks/useExplorerRouteSync";

type FoldersScreenProps = {
  route: FoldersRouteAdapter;
};

export const FoldersScreen = ({ route }: FoldersScreenProps) => {
  const initialRouteStateRef = useRef<ExplorerRouteState | null>(null);

  if (initialRouteStateRef.current === null) {
    initialRouteStateRef.current = route.readRouteState();
  }

  const controller = useExplorerController({
    initialRouteState: initialRouteStateRef.current,
    onOpenSettings: route.openSettings,
  });

  const { resetExplorerPaneScroll } = useWorkspaceScrollController({
    isDesktop: route.isDesktop,
  });

  const { folders = [], loading: foldersLoading } = useFolders();
  const { cards = [], loading: cardsLoading } = useCards();
  const { documents = [] } = useDocuments();

  const lookups = useExplorerLookups({
    folders,
    cards,
    documents,
    selectedItem: controller.state.selectedItem,
  });

  useExplorerRouteSync({
    route,
    isHomeOnlyMode: controller.state.isHomeOnlyMode,
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    applyRouteState: controller.actions.applyRouteState,
  });

  useExplorerFolderSelectionBridge({
    folders: lookups.normalizedFolders,
    onSelectFolder: controller.actions.selectFolder,
    onNavigateToSectionList: controller.actions.navigateToSectionList,
  });

  useExplorerBreadcrumbSync({
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    explorerBreadcrumbContext: controller.state.explorerBreadcrumbContext,
    folderById: lookups.folderById,
    cardById: lookups.cardById,
    documentById: lookups.documentById,
  });

  useEffect(() => {
    route.persistLastSelectedFolderId(controller.state.selectedFolderId);
    notifySelectedFolderChanged(controller.state.selectedFolderId);
  }, [route, controller.state.selectedFolderId]);

  const handleFolderSelect = (folderId: string | null) => {
    resetExplorerPaneScroll();
    controller.actions.selectFolder(folderId);
  };

  const handleItemSelect = (item: SelectedExplorerItem) => {
    controller.actions.selectItem(item);
  };

  const isLoading = foldersLoading || cardsLoading;

  if (controller.state.isHomeOnlyMode) {
    return <div className="flex min-h-0 h-full w-full bg-[#F8FAFB]" />;
  }

  return (
    <div
      className={cn(
        "bg-[#F8FAFB] relative flex min-h-0 h-full flex-col",
        route.isDesktop
          ? "overflow-hidden"
          : "overflow-x-hidden overflow-y-auto",
      )}
    >
      <div
        className="absolute inset-0 opacity-100 pointer-events-none z-0"
        style={{
          ...getPageRuledBg(),
        }}
      />
      <div className="relative z-10 w-full mx-auto h-full min-h-0 flex">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <TreeViewLayout
            folders={lookups.normalizedFolders}
            cards={cards}
            documents={documents}
            selectedFolderId={controller.state.selectedFolderId}
            selectedItem={controller.state.selectedItem}
            selectedCardId={lookups.selectedCardId}
            selectedDocumentId={lookups.selectedDocumentId}
            onFolderSelect={handleFolderSelect}
            onItemSelect={handleItemSelect}
            onCardUpdated={() => {
              // カード更新後の処理は既存実装へ委譲
            }}
            onBreadcrumbContextChange={controller.actions.setBreadcrumbContext}
            navigateToSectionListToken={
              controller.state.navigateToSectionListToken
            }
            folderSelectionNonce={controller.state.folderSelectionNonce}
          />
        )}
      </div>
    </div>
  );
};
