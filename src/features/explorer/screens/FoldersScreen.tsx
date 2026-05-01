import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
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
import { ExplorerWorkspaceFrame } from "@/features/workspace-tabs/components/ExplorerWorkspaceFrame";
import type {
  WorkspaceEntityTab,
  WorkspaceTab,
} from "@/features/workspace-tabs/domain/workspaceTab";
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
import type { SelectedExplorerItem } from "@/types";

type FoldersScreenProps = {
  route: FoldersRouteAdapter;
};

const FOLDERS_SCREEN_FILL_STYLE = {
  width: "100%",
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

const resolveActiveTab = (
  tabs: WorkspaceTab[],
  activeTabId: WorkspaceTab["id"] | null,
): WorkspaceTab | null => {
  if (activeTabId === null) {
    return null;
  }

  return tabs.find((tab) => tab.id === activeTabId) ?? null;
};

const resolveSelectedExplorerItemId = (item: SelectedExplorerItem) => {
  if (!item || !("id" in item)) {
    return null;
  }

  return item.id;
};

const areSelectedExplorerItemsEqual = (
  left: SelectedExplorerItem,
  right: SelectedExplorerItem,
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  if (left.type !== right.type) {
    return false;
  }

  return (
    resolveSelectedExplorerItemId(left) === resolveSelectedExplorerItemId(right)
  );
};

const areExplorerRouteStatesEqual = (
  left: ExplorerRouteState,
  right: ExplorerRouteState,
) => {
  return (
    left.isHomeOnlyMode === right.isHomeOnlyMode &&
    left.isSectionListMode === right.isSectionListMode &&
    left.selectedFolderId === right.selectedFolderId &&
    areSelectedExplorerItemsEqual(left.selectedItem, right.selectedItem)
  );
};

export const FoldersScreen = ({ route }: FoldersScreenProps) => {
  const [initialRouteState] = useState<ExplorerRouteState>(() =>
    route.readRouteState(),
  );

  const controller = useExplorerController({
    initialRouteState,

  });

  const {
    applyRouteState,
    navigateToSectionList,
    selectFolder,
    selectItem,
    setBreadcrumbContext,
  } = controller.actions;

  const previousActiveExplorerTabIdRef = useRef<WorkspaceTab["id"] | null>(
    null,
  );
  const restoringExplorerTabIdRef = useRef<WorkspaceTab["id"] | null>(null);

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
  const openCardSetTab = useWorkspaceTabsStore((state) => state.openCardSetTab);
  const updateExplorerTabState = useWorkspaceTabsStore(
    (state) => state.updateExplorerTabState,
  );
  const updateTabTitle = useWorkspaceTabsStore((state) => state.updateTabTitle);

  const activeTab = useMemo(
    () => resolveActiveTab(tabs, activeTabId),
    [activeTabId, tabs],
  );

  const activeExplorerTabId =
    activeTab?.kind === "explorer" ? activeTab.id : null;
  const activeExplorerState =
    activeTab?.kind === "explorer" ? activeTab.explorerState : null;

  const cardById = useMemo(() => buildMapById(cards), [cards]);
  const cardSetById = useMemo(() => buildMapById(cardSets), [cardSets]);
  const documentById = useMemo(() => buildMapById(documents), [documents]);

  const selectedCardId = resolveSelectedCardId(controller.state.selectedItem);
  const selectedDocumentId = resolveSelectedDocumentId(
    controller.state.selectedItem,
  );

  const selectedCard = selectedCardId
    ? (cardById.get(selectedCardId) ?? null)
    : null;
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

  const fallbackEntityTab = useMemo<WorkspaceEntityTab | null>(() => {
    const selectedItem = controller.state.selectedItem;

    if (!selectedItem) {
      return null;
    }

    if (selectedItem.type === "document") {
      const document = documentById.get(selectedItem.id);
      return {
        id: `document:${selectedItem.id}`,
        kind: "document",
        title: document ? resolveDocumentTabTitle(document) : "PDF",
        documentId: selectedItem.id,
        folderId: document?.folderId ?? controller.state.selectedFolderId,
        isClosable: true,
        sectionKey: "library",
      };
    }

    if (selectedItem.type === "card") {
      const card = cardById.get(selectedItem.id);
      return {
        id: `card:${selectedItem.id}`,
        kind: "card",
        title: card ? resolveCardTabTitle(card) : "カード",
        cardId: selectedItem.id,
        folderId: card
          ? resolveCardFolderId(card, cardSetById)
          : controller.state.selectedFolderId,
        isClosable: true,
        sectionKey: "library",
      };
    }

    if (selectedItem.type === "cardSet") {
      const cardSet = cardSetById.get(selectedItem.id);
      return {
        id: `cardSet:${selectedItem.id}`,
        kind: "cardSet",
        title: cardSet ? resolveCardSetTabTitle(cardSet) : "カードセット",
        cardSetId: selectedItem.id,
        folderId: cardSet?.folderId ?? controller.state.selectedFolderId,
        isClosable: true,
        sectionKey: "library",
      };
    }

    return null;
  }, [
    cardById,
    cardSetById,
    controller.state.selectedFolderId,
    controller.state.selectedItem,
    documentById,
  ]);

  const resolvedEntityTab =
    activeTab?.kind === "document" ||
    activeTab?.kind === "card" ||
    activeTab?.kind === "cardSet"
      ? activeTab
      : fallbackEntityTab;

  useExplorerRouteSync({
    route,
    isHomeOnlyMode: controller.state.isHomeOnlyMode,
    isSectionListMode: controller.state.isSectionListMode,
    selectedFolderId: controller.state.selectedFolderId,
    selectedItem: controller.state.selectedItem,
    applyRouteState,
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
    if (!activeExplorerTabId || !activeExplorerState) {
      previousActiveExplorerTabIdRef.current = null;
      restoringExplorerTabIdRef.current = null;
      return;
    }

    if (previousActiveExplorerTabIdRef.current === activeExplorerTabId) {
      return;
    }

    previousActiveExplorerTabIdRef.current = activeExplorerTabId;

    if (
      areExplorerRouteStatesEqual(
        currentExplorerRouteState,
        activeExplorerState,
      )
    ) {
      restoringExplorerTabIdRef.current = null;
      return;
    }

    restoringExplorerTabIdRef.current = activeExplorerTabId;
    applyRouteState(activeExplorerState);
  }, [
    activeExplorerState,
    activeExplorerTabId,
    applyRouteState,
    currentExplorerRouteState,
  ]);

  useEffect(() => {
    if (!activeExplorerTabId || !activeExplorerState) {
      return;
    }

    if (restoringExplorerTabIdRef.current === activeExplorerTabId) {
      if (
        areExplorerRouteStatesEqual(
          currentExplorerRouteState,
          activeExplorerState,
        )
      ) {
        restoringExplorerTabIdRef.current = null;
      }

      return;
    }

    if (
      areExplorerRouteStatesEqual(
        currentExplorerRouteState,
        activeExplorerState,
      )
    ) {
      return;
    }

    updateExplorerTabState(activeExplorerTabId, currentExplorerRouteState);
  }, [
    activeExplorerState,
    activeExplorerTabId,
    currentExplorerRouteState,
    updateExplorerTabState,
  ]);

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
      navigateToSectionList();
    });
  }, [navigateToSectionList, resetExplorerPaneScroll]);

  useEffect(() => {
    route.persistLastSelectedFolderId(controller.state.selectedFolderId);
    notifySelectedFolderChanged(controller.state.selectedFolderId);
  }, [route, controller.state.selectedFolderId]);

  const handleFolderSelect = (folderId: string | null) => {
    resetExplorerPaneScroll();
    selectFolder(folderId);
  };

  const handleItemSelect = (item: SelectedExplorerItem) => {
    selectItem(item);

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

  if (foldersLoading) {
    return null;
  }

  const explorerContent = (
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
      onBreadcrumbContextChange={setBreadcrumbContext}
      navigateToSectionListToken={controller.state.navigateToSectionListToken}
      folderSelectionNonce={controller.state.folderSelectionNonce}
    />
  );

  const workspaceContent = resolvedEntityTab ? (
    <WorkspaceTabPanel
      activeTab={resolvedEntityTab}
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
  ) : (
    explorerContent
  );

  return (
    <ExplorerWorkspaceFrame
      style={FOLDERS_SCREEN_FILL_STYLE}
      className={cn(!route.isDesktop && "overflow-x-hidden overflow-y-auto")}
      showExplorerChrome={false}
    >
      {workspaceContent}
    </ExplorerWorkspaceFrame>
  );
};
