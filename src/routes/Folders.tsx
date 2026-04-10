import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { buildExplorerBreadcrumbs } from "@/features/breadcrumbs/builders";
import {
  areExplorerBreadcrumbContextsEqual,
  EMPTY_EXPLORER_BREADCRUMB_CONTEXT,
  type ExplorerBreadcrumbContext,
} from "@/features/breadcrumbs/types";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

type CardSelectedItem = Extract<SelectedExplorerItem, { type: "card" }>;
type DocumentSelectedItem = Extract<SelectedExplorerItem, { type: "document" }>;
type RootSelectedItem = Extract<
  SelectedExplorerItem,
  { type: "directory" | "gallery" | "calendar" | "trash" }
>;

const createCardSelectedItem = (cardId: string): CardSelectedItem => ({
  type: "card",
  id: cardId,
});

const createDocumentSelectedItem = (docId: string): DocumentSelectedItem => ({
  type: "document",
  id: docId,
});

const isDocumentItem = (value: unknown): value is DocumentItem =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  "folderId" in value &&
  "orderIndex" in value &&
  "title" in value;

const Folders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const { setIsSettingsOpen } = useSettingsQueryParam(
    searchParams,
    setSearchParams,
  );
  const isDesktop = useIsDesktopRuntime();
  const isHomeOnlyMode = searchParams.get("home") === "1";
  const queryFolderId = searchParams.get("folderId");
  const queryCardId = searchParams.get("cardId");
  const queryDocId = searchParams.get("docId");

  const pendingUrlSyncRef = useRef<string | null>(null);
  const urlSyncTimerRef = useRef(0);
  const [folderSelectionNonce, setFolderSelectionNonce] = useState(0);
  const [explorerBreadcrumbContext, setExplorerBreadcrumbContext] =
    useState<ExplorerBreadcrumbContext>(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);

  const forceResetWorkspaceScroll = useCallback(() => {
    const reset = () => {
      const main = document.querySelector(".app-layout__main");
      if (main instanceof HTMLElement) {
        main.scrollTop = 0;
      }
      if (!isDesktop) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    reset();
    window.requestAnimationFrame(reset);
  }, [isDesktop]);

  const notifyMainSidebarFolderSelection = useCallback(
    (folderId: string | null) => {
      window.dispatchEvent(
        new CustomEvent("folders:selected-folder-changed", {
          detail: { folderId: folderId ?? null },
        }),
      );
    },
    [],
  );

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    () => {
      if (isHomeOnlyMode) return null;
      if (queryFolderId) return queryFolderId;
      return localStorage.getItem("folder_selectedFolderId_work") || null;
    },
  );

  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem("folder_selectedFolderId_work", selectedFolderId);
    } else {
      localStorage.removeItem("folder_selectedFolderId_work");
    }
  }, [selectedFolderId]);

  const [selectedItem, setSelectedItem] = useState<SelectedExplorerItem>(() => {
    if (isHomeOnlyMode) return null;
    if (queryCardId) return createCardSelectedItem(queryCardId);
    if (queryDocId) return createDocumentSelectedItem(queryDocId);
    return null;
  });

  const selectedFolderIdRef = useRef<string | null>(selectedFolderId);
  const selectedItemRef = useRef<SelectedExplorerItem>(selectedItem);

  useEffect(() => {
    selectedFolderIdRef.current = selectedFolderId;
    selectedItemRef.current = selectedItem;
  }, [selectedFolderId, selectedItem]);

  const selectedCardId = selectedItem?.type === "card" ? selectedItem.id : null;
  const selectedDocumentId =
    selectedItem?.type === "document" ? selectedItem.id : null;

  useEffect(() => {
    const resetMainScroll = () => {
      const main = document.querySelector(".app-layout__main");
      if (main instanceof HTMLElement) {
        main.scrollTop = 0;
      }
    };

    resetMainScroll();
    const raf = window.requestAnimationFrame(resetMainScroll);
    return () => window.cancelAnimationFrame(raf);
  }, [selectedFolderId, selectedCardId, selectedDocumentId]);

  useEffect(() => {
    const next = new URLSearchParams(queryString);

    if (selectedFolderId || selectedItem) {
      next.delete("home");
    }

    if (selectedFolderId) {
      next.set("folderId", selectedFolderId);
    } else {
      next.delete("folderId");
    }

    if (selectedItem?.type === "card") {
      next.set("cardId", selectedItem.id);
      next.delete("docId");
    } else if (selectedItem?.type === "document") {
      next.set("docId", selectedItem.id);
      next.delete("cardId");
    } else {
      next.delete("cardId");
      next.delete("docId");
    }

    const current = queryString;
    const target = next.toString();

    if (current === target) {
      if (pendingUrlSyncRef.current === current) {
        pendingUrlSyncRef.current = null;
      }
      if (urlSyncTimerRef.current) {
        window.clearTimeout(urlSyncTimerRef.current);
        urlSyncTimerRef.current = 0;
      }
      return;
    }

    if (urlSyncTimerRef.current) {
      window.clearTimeout(urlSyncTimerRef.current);
      urlSyncTimerRef.current = 0;
    }

    pendingUrlSyncRef.current = target;

    urlSyncTimerRef.current = window.setTimeout(() => {
      startTransition(() => {
        setSearchParams(next, { replace: true });
      });
    }, 90);

    return () => {
      if (urlSyncTimerRef.current) {
        window.clearTimeout(urlSyncTimerRef.current);
        urlSyncTimerRef.current = 0;
      }
    };
  }, [selectedFolderId, selectedItem, queryString, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const pendingTarget = pendingUrlSyncRef.current;
      if (pendingTarget !== null) {
        if (queryString !== pendingTarget) return;
        pendingUrlSyncRef.current = null;
        return;
      }

      if (queryFolderId !== selectedFolderId) {
        setSelectedFolderId(queryFolderId || null);
      }

      if (
        queryCardId &&
        (selectedItem?.type !== "card" || selectedItem.id !== queryCardId)
      ) {
        setSelectedItem(createCardSelectedItem(queryCardId));
        return;
      }

      if (
        queryDocId &&
        (selectedItem?.type !== "document" || selectedItem.id !== queryDocId)
      ) {
        setSelectedItem(createDocumentSelectedItem(queryDocId));
        return;
      }

      if (
        !queryCardId &&
        !queryDocId &&
        (selectedItem?.type === "card" || selectedItem?.type === "document")
      ) {
        setSelectedItem(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    queryString,
    queryFolderId,
    queryCardId,
    queryDocId,
    selectedFolderId,
    selectedItem,
  ]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!isHomeOnlyMode) return;
      notifyMainSidebarFolderSelection(null);
      setSelectedFolderId(null);
      setSelectedItem(null);
      setExplorerBreadcrumbContext(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = null;
      selectedItemRef.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [isHomeOnlyMode, notifyMainSidebarFolderSelection]);

  const { folders = [], loading: foldersLoading } = useFolders();
  const { cards = [], loading: cardsLoading } = useCards();
  const { documents = [] } = useDocuments();

  const typedDocuments = useMemo<DocumentItem[]>(
    () => documents.filter(isDocumentItem),
    [documents],
  );

  const normalizedFolders = useMemo<Folder[]>(
    () =>
      folders.map((folder) => ({
        ...folder,
        parentFolderId:
          typeof folder.parentFolderId === "string" ||
          folder.parentFolderId === null
            ? folder.parentFolderId
            : null,
        folderColor:
          typeof folder.folderColor === "string"
            ? folder.folderColor
            : undefined,
      })),
    [folders],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isDesktop) {
      document.documentElement.classList.add("no-page-scroll");
    } else {
      document.documentElement.classList.remove("no-page-scroll");
    }
    return () => {
      document.documentElement.classList.remove("no-page-scroll");
    };
  }, [isDesktop]);

  const handleSelectFolderInWork = useCallback(
    (folderId: string | null) => {
      if (
        selectedFolderIdRef.current === folderId &&
        selectedItemRef.current === null
      ) {
        return;
      }

      forceResetWorkspaceScroll();
      setFolderSelectionNonce((nonce) => nonce + 1);
      notifyMainSidebarFolderSelection(folderId);
      setSelectedFolderId(folderId);
      setSelectedItem(null);
      setExplorerBreadcrumbContext(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = folderId;
      selectedItemRef.current = null;
    },
    [forceResetWorkspaceScroll, notifyMainSidebarFolderSelection],
  );

  const handleSelectCardInWork = useCallback((cardId: string) => {
    const current = selectedItemRef.current;
    if (current?.type === "card" && current.id === cardId) return;

    const nextItem = createCardSelectedItem(cardId);
    setSelectedItem(nextItem);
    selectedItemRef.current = nextItem;
  }, []);

  const handleSelectDocumentInWork = useCallback((docId: string) => {
    const current = selectedItemRef.current;
    if (current?.type === "document" && current.id === docId) return;

    const nextItem = createDocumentSelectedItem(docId);
    setSelectedItem(nextItem);
    selectedItemRef.current = nextItem;
  }, []);

  const handleSelectRootItemInWork = useCallback(
    (item: RootSelectedItem) => {
      notifyMainSidebarFolderSelection(null);
      setSelectedItem(item);
      setSelectedFolderId(null);
      setExplorerBreadcrumbContext(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = null;
      selectedItemRef.current = item;
    },
    [notifyMainSidebarFolderSelection],
  );

  const handleSelectItemInWork = useCallback(
    (item: SelectedExplorerItem) => {
      if (!item) {
        if (selectedItemRef.current === null) return;
        setSelectedItem(null);
        selectedItemRef.current = null;
        return;
      }

      switch (item.type) {
        case "card":
          handleSelectCardInWork(item.id);
          return;

        case "document":
          handleSelectDocumentInWork(item.id);
          return;

        case "directory":
        case "gallery":
        case "calendar":
        case "trash":
          handleSelectRootItemInWork(item);
          return;

        case "settings":
          setIsSettingsOpen(true);
          return;

        case "cardSet":
          if (
            selectedItemRef.current?.type === "cardSet" &&
            selectedItemRef.current.id === item.id
          ) {
            return;
          }
          setSelectedItem(item);
          selectedItemRef.current = item;
          return;
      }
    },
    [
      handleSelectCardInWork,
      handleSelectDocumentInWork,
      handleSelectRootItemInWork,
      setIsSettingsOpen,
    ],
  );

  const isLoading = foldersLoading || cardsLoading;

  const { setExtraCrumbs, registerFolderSelectHandler } =
    useBreadcrumbContext();
  const [navigateToSectionListToken, setNavigateToSectionListToken] =
    useState(0);
  const foldersRef = useRef<Folder[]>(normalizedFolders);

  useEffect(() => {
    foldersRef.current = normalizedFolders;
  }, [normalizedFolders]);

  useEffect(() => {
    registerFolderSelectHandler((folderId) => {
      notifyMainSidebarFolderSelection(folderId ?? null);
      setSelectedFolderId(folderId ?? null);
      setSelectedItem(null);
      setExplorerBreadcrumbContext(EMPTY_EXPLORER_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = folderId ?? null;
      selectedItemRef.current = null;

      if (!folderId) {
        setNavigateToSectionListToken((nonce) => nonce + 1);
        return;
      }

      const folder = foldersRef.current.find((entry) => entry.id === folderId);
      if (folder && !folder.parentFolderId) {
        setNavigateToSectionListToken((nonce) => nonce + 1);
      }
    });
  }, [registerFolderSelectHandler, notifyMainSidebarFolderSelection]);

  const folderById = useMemo(
    () =>
      new Map<string, Folder>(
        normalizedFolders.map((folder): [string, Folder] => [
          folder.id,
          folder,
        ]),
      ),
    [normalizedFolders],
  );

  const cardById = useMemo(
    () =>
      new Map<string, Card>(
        cards.map((card): [string, Card] => [card.id, card]),
      ),
    [cards],
  );

  const documentById = useMemo(() => {
    const map = new Map<string, DocumentItem>();
    for (const documentItem of typedDocuments) {
      const key =
        typeof documentItem.id === "string" && documentItem.id.length > 0
          ? documentItem.id
          : typeof documentItem.documentId === "string" &&
              documentItem.documentId.length > 0
            ? documentItem.documentId
            : null;
      if (key) {
        map.set(key, documentItem);
      }
    }
    return map;
  }, [typedDocuments]);

  const handleExplorerBreadcrumbContextChange = useCallback(
    (next: ExplorerBreadcrumbContext) => {
      setExplorerBreadcrumbContext((prev) =>
        areExplorerBreadcrumbContextsEqual(prev, next) ? prev : next,
      );
    },
    [],
  );

  const extraCrumbs = useMemo(
    () =>
      buildExplorerBreadcrumbs({
        selectedFolderId,
        explorerBreadcrumbContext,
        selectedItem,
        folderById,
        cardById,
        documentById,
      }),
    [
      selectedFolderId,
      explorerBreadcrumbContext,
      selectedItem,
      folderById,
      cardById,
      documentById,
    ],
  );

  useLayoutEffect(() => {
    setExtraCrumbs(extraCrumbs);
  }, [extraCrumbs, setExtraCrumbs]);

  if (isHomeOnlyMode) {
    return <div className="flex min-h-0 h-full w-full bg-[#F8FAFB]" />;
  }

  return (
    <div
      className={cn(
        "bg-[#F8FAFB] relative flex min-h-0 h-full flex-col",
        isDesktop ? "overflow-hidden" : "overflow-x-hidden overflow-y-auto",
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
            folders={normalizedFolders}
            cards={cards}
            documents={typedDocuments}
            selectedFolderId={selectedFolderId}
            selectedItem={selectedItem}
            selectedCardId={selectedCardId}
            selectedDocumentId={selectedDocumentId}
            onFolderSelect={handleSelectFolderInWork}
            onItemSelect={handleSelectItemInWork}
            onCardUpdated={() => {
              // カード更新後の処理
            }}
            onBreadcrumbContextChange={handleExplorerBreadcrumbContextChange}
            navigateToSectionListToken={navigateToSectionListToken}
            folderSelectionNonce={folderSelectionNonce}
          />
        )}
      </div>
    </div>
  );
};

export default Folders;
