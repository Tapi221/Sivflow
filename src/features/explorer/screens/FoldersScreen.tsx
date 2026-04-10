import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { cn } from "@/lib/utils";
import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import { useExplorerController } from "../controller/useExplorerController";
import { notifySelectedFolderChanged } from "../adapters/web/explorerSelectionNotifier";
import type { FoldersRouteAdapter } from "../adapters/web/useFoldersRouteAdapter";
import { useWorkspaceScrollController } from "../adapters/web/useWorkspaceScrollController";
import { useExplorerBreadcrumbSync } from "../hooks/useExplorerBreadcrumbSync";
import { useExplorerFolderSelectionBridge } from "../hooks/useExplorerFolderSelectionBridge";
import { useExplorerLookups } from "../hooks/useExplorerLookups";
import { useExplorerRouteSync } from "../hooks/useExplorerRouteSync";

type FoldersScreenProps = {
  route: FoldersRouteAdapter;
};

export const FoldersScreen = ({ route }: FoldersScreenProps) => {
  const initialRouteState = route.readRouteState();
  const { resetExplorerPaneScroll } = useWorkspaceScrollController({
    isDesktop: route.isDesktop,
  });

  const controller = useExplorerController({
    initialRouteState,
    onOpenSettings: route.openSettings,
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
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    applyRouteState: controller.actions.applyRouteState,
  });

  useExplorerFolderSelectionBridge({
    folders: lookups.normalizedFolders,
    onSelectFolder: controller.actions.selectFolder,
    onNavigateToSectionList: controller.actions.navigateToSectionList,
  });

  const { onBreadcrumbContextChange } = useExplorerBreadcrumbSync({
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    explorerBreadcrumbContext: controller.state.explorerBreadcrumbContext,
    folderById: lookups.folderById,
    cardById: lookups.cardById,
    documentById: lookups.documentById,
  });

  const handleFolderSelect = (folderId: string | null) => {
    resetExplorerPaneScroll();
    route.persistLastSelectedFolderId(folderId);
    notifySelectedFolderChanged(folderId);
    controller.actions.selectFolder(folderId);
  };

  const handleItemSelect = (item: import("@/types").SelectedExplorerItem) => {
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
            onCardUpdated={() => {}}
            onBreadcrumbContextChange={(next) => {
              controller.actions.setBreadcrumbContext(
                onBreadcrumbContextChange(next),
              );
            }}
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
