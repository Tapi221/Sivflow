import { useEffect, useMemo, useState } from "react";

import { FoldersScreenSkeleton } from "@/components/loading/ScreenSkeletons";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { notifySelectedFolderChanged } from "@/features/explorer/adapters/web/explorerSelectionNotifier";
import { subscribeSectionListNavigation } from "@/features/explorer/adapters/web/explorerSectionListNavigation";
import type { FoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";
import { useWorkspaceScrollController } from "@/features/explorer/adapters/web/useWorkspaceScrollController";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useExplorerController } from "@/features/explorer/controller/useExplorerController";
import { useExplorerBreadcrumbSync } from "@/features/explorer/hooks/useExplorerBreadcrumbSync";
import { useExplorerLookups } from "@/features/explorer/hooks/useExplorerLookups";
import { useExplorerRouteSync } from "@/features/explorer/hooks/useExplorerRouteSync";
import { useSelectedExplorerCard } from "@/features/explorer/hooks/useSelectedExplorerCard";
import { useSelectedExplorerDocument } from "@/features/explorer/hooks/useSelectedExplorerDocument";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { cn } from "@/lib/utils";
import type { SelectedExplorerItem } from "@/types";

type FoldersScreenProps = {
  route: FoldersRouteAdapter;
};

const resolveSelectedCardId = (selectedItem: SelectedExplorerItem) => {
  if (selectedItem?.type !== "card") {
    return null;
  }

  return selectedItem.id;
};

const resolveSelectedDocumentId = (selectedItem: SelectedExplorerItem) => {
  if (selectedItem?.type !== "document") {
    return null;
  }

  return selectedItem.id;
};

export const FoldersScreen = ({ route }: FoldersScreenProps) => {
  const [initialRouteState] = useState<ExplorerRouteState | null>(() =>
    route.readRouteState(),
  );

  const controller = useExplorerController({
    initialRouteState,
    onOpenSettings: route.openSettings,
  });

  const { resetExplorerPaneScroll } = useWorkspaceScrollController({
    isDesktop: route.isDesktop,
  });

  const { folders = [], loading: foldersLoading } = useFoldersRead();

  const selectedCardId = resolveSelectedCardId(controller.state.selectedItem);
  const selectedDocumentId = resolveSelectedDocumentId(
    controller.state.selectedItem,
  );

  const { card: selectedCard } = useSelectedExplorerCard(selectedCardId);
  const { document: selectedDocument } =
    useSelectedExplorerDocument(selectedDocumentId);

  const breadcrumbCards = useMemo(
    () => (selectedCard ? [selectedCard] : []),
    [selectedCard],
  );
  const breadcrumbDocuments = useMemo(
    () => (selectedDocument ? [selectedDocument] : []),
    [selectedDocument],
  );

  const lookups = useExplorerLookups({
    folders,
    cards: breadcrumbCards,
    documents: breadcrumbDocuments,
    selectedItem: controller.state.selectedItem,
  });

  useExplorerRouteSync({
    route,
    isHomeOnlyMode: controller.state.isHomeOnlyMode,
    isSectionListMode: controller.state.isSectionListMode,
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    applyRouteState: controller.actions.applyRouteState,
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
    return subscribeSectionListNavigation(() => {
      resetExplorerPaneScroll();
      controller.actions.navigateToSectionList();
    });
  }, [controller.actions.navigateToSectionList, resetExplorerPaneScroll]);

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

  if (controller.state.isHomeOnlyMode) {
    return <div className="flex min-h-0 h-full w-full bg-transparent" />;
  }

  if (foldersLoading) {
    return <FoldersScreenSkeleton />;
  }

  return (
    <div
      className={cn(
        "relative flex min-h-0 h-full flex-col bg-transparent",
        route.isDesktop
          ? "overflow-hidden"
          : "overflow-x-hidden overflow-y-auto",
      )}
    >
      <div className="relative z-10 w-full mx-auto h-full min-h-0 flex">
        <TreeViewLayout
          folders={lookups.normalizedFolders}
          isSectionListMode={controller.state.isSectionListMode}
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
      </div>
    </div>
  );
};
