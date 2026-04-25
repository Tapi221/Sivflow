import { type CSSProperties, useEffect, useMemo, useState } from "react";

import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { FoldersScreenSkeleton } from "@/components/loading/ScreenSkeletons";
import { notifySelectedFolderChanged } from "@/features/explorer/adapters/web/explorerSelectionNotifier";
import { subscribeSectionListNavigation } from "@/features/explorer/adapters/web/explorerSectionListNavigation";
import type { FoldersRouteAdapter } from "@/features/explorer/adapters/web/useFoldersRouteAdapter";
import { useWorkspaceScrollController } from "@/features/explorer/adapters/web/useWorkspaceScrollController";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { useExplorerController } from "@/features/explorer/controller/useExplorerController";
import { useExplorerBreadcrumbSync } from "@/features/explorer/hooks/useExplorerBreadcrumbSync";
import { useExplorerLookups } from "@/features/explorer/hooks/useExplorerLookups";
import { useExplorerRouteSync } from "@/features/explorer/hooks/useExplorerRouteSync";
import { WorkspaceTabPanel } from "@/features/workspace-tabs/components/WorkspaceTabPanel";
import { WorkspaceTabsBar } from "@/features/workspace-tabs/components/WorkspaceTabsBar";
import type { WorkspaceTab } from "@/features/workspace-tabs/domain/workspaceTab";
import {
  resolveCardSetTabTitle,
  resolveCardTabTitle,
  resolveDocumentTabTitle,
} from "@/features/workspace-tabs/lib/resolveWorkspaceTabTitle";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";
import { useCardsRead } from "@/hooks/card/useCardsRead";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";
import { useDocumentsRead } from "@/hooks/platform/useDocumentsRead";
import { cn } from "@/lib/utils";
import type { Card, CardSet, DocumentItem, SelectedExplorerItem } from "@/types";

type FoldersScreenProps = {
  route: FoldersRouteAdapter;
};

const FOLDERS_SCREEN_FILL_STYLE = {
  width:
    "calc(100dvw - var(--app-layout-padding-x, 12px) - var(--app-layout-padding-x, 12px))",
  maxWidth: "none",
} satisfies CSSProperties;

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

const buildMapById = <TEntity extends { id: string }>(entities: TEntity[]) => {
  return new Map(entities.map((entity) => [entity.id, entity]));
};

const resolveCardFolderId = (
  card: Card,
  cardSetById: Map<string, CardSet>,
): string | null => {
  return card.folderId ?? cardSetById.get(card.cardSetId)?.folderId ?? null;
};

const resolveActiveTab = (
  tabs: WorkspaceTab[],
  activeTabId: WorkspaceTab["id"],
): WorkspaceTab | null => {
  return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
};

export const FoldersScreen = ({ route }: FoldersScreenProps) => {
  const [initialRouteState] = useState<ExplorerRouteState>(() =>
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
  const { cards = [], loading: cardsLoading } = useCardsRead();
  const { documents = [], loading: documentsLoading } = useDocumentsRead();
  const { cardSets = [], loading: cardSetsLoading } = useCardSets();

  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openDocumentTab = useWorkspaceTabsStore(
    (state) => state.openDocumentTab,
  );
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);
  const openCardSetTab = useWorkspaceTabsStore(
    (state) => state.openCardSetTab,
  );
  const updateExplorerTabState = useWorkspaceTabsStore(
    (state) => state.updateExplorerTabState,
  );
  const updateTabTitle = useWorkspaceTabsStore((state) => state.updateTabTitle);

  const activeTab = useMemo(
    () => resolveActiveTab(tabs, activeTabId),
    [activeTabId, tabs],
  );

  const cardById = useMemo(() => buildMapById(cards), [cards]);
  const cardSetById = useMemo(() => buildMapById(cardSets), [cardSets]);
  const documentById = useMemo(() => buildMapById(documents), [documents]);

  const selectedCardId = resolveSelectedCardId(controller.state.selectedItem);
  const selectedDocumentId = resolveSelectedDocumentId(
    controller.state.selectedItem,
  );

  const selectedCard = selectedCardId ? (cardById.get(selectedCardId) ?? null) : null;
  const selectedDocument = selectedDocumentId
    ? (documentById.get(selectedDocumentId) ?? null)
    : null;

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

  const currentExplorerRouteState = useMemo<ExplorerRouteState>(
    () => ({
      isHomeOnlyMode: controller.state.isHomeOnlyMode,
      isSectionListMode: controller.state.isSectionListMode,
      selectedFolderId: controller.state.selectedFolderId,
      selectedItem: controller.state.selectedItem,
    }),
    [
      controller.state.isHomeOnlyMode,
      controller.state.isSectionListMode,
      controller.state.selectedFolderId,
      controller.state.selectedItem,
    ],
  );

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
    if (activeTab?.kind !== "explorer") return;

    controller.actions.applyRouteState(activeTab.explorerState);
  }, [activeTab, controller.actions.applyRouteState]);

  useEffect(() => {
    if (activeTab?.kind !== "explorer") return;

    updateExplorerTabState(activeTab.id, currentExplorerRouteState);
  }, [activeTab, currentExplorerRouteState, updateExplorerTabState]);

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.kind === "document") {
        const document = documentById.get(tab.documentId);
        if (document) updateTabTitle(tab.id, resolveDocumentTabTitle(document));
        return;
      }

      if (tab.kind === "card") {
        const card = cardById.get(tab.cardId);
        if (card) updateTabTitle(tab.id, resolveCardTabTitle(card));
        return;
      }

      if (tab.kind === "cardSet") {
        const cardSet = cardSetById.get(tab.cardSetId);
        if (cardSet) updateTabTitle(tab.id, resolveCardSetTabTitle(cardSet));
      }
    });
  }, [cardById, cardSetById, documentById, tabs, updateTabTitle]);

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

    if (item?.type === "document") {
      const document = documentById.get(item.id);
      openDocumentTab({
        documentId: item.id,
        title: document ? resolveDocumentTabTitle(document) : "PDF",
        folderId: document?.folderId ?? controller.state.selectedFolderId,
      });
      return;
    }

    if (item?.type === "card") {
      const card = cardById.get(item.id);
      openCardTab({
        cardId: item.id,
        title: card ? resolveCardTabTitle(card) : "カード",
        folderId: card ? resolveCardFolderId(card, cardSetById) : null,
      });
      return;
    }

    if (item?.type === "cardSet") {
      const cardSet = cardSetById.get(item.id);
      openCardSetTab({
        cardSetId: item.id,
        title: cardSet ? resolveCardSetTabTitle(cardSet) : "カードセット",
        folderId: cardSet?.folderId ?? null,
      });
    }
  };

  if (controller.state.isHomeOnlyMode) {
    return <div className="flex min-h-0 h-full w-full bg-transparent" />;
  }

  if (foldersLoading || !activeTab) {
    return <FoldersScreenSkeleton />;
  }

  const explorerContent = (
    <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 max-w-none">
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
        navigateToSectionListToken={controller.state.navigateToSectionListToken}
        folderSelectionNonce={controller.state.folderSelectionNonce}
      />
    </div>
  );

  return (
    <div
      style={FOLDERS_SCREEN_FILL_STYLE}
      className={cn(
        "relative flex h-full min-h-0 min-w-0 max-w-none flex-col overflow-hidden bg-transparent",
        !route.isDesktop && "overflow-x-hidden overflow-y-auto",
      )}
    >
      <WorkspaceTabsBar />

      <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-b-[14px] border-x border-b border-[#dddcd5] bg-white">
        <WorkspaceTabPanel
          activeTab={activeTab}
          explorerContent={explorerContent}
          cards={cards}
          cardSets={cardSets}
          documents={documents}
          cardsLoading={cardsLoading}
          cardSetsLoading={cardSetsLoading}
          documentsLoading={documentsLoading}
          onCardUpdated={() => {
            // カード更新後の処理は既存実装へ委譲
          }}
        />
      </div>
    </div>
  );
};
