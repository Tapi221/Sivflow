import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { getCardText } from "@/domain/card/content";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types";
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

/**
 * Explorer から通知されるパンくず用コンテキスト
 */
type ExplorerBreadcrumbContext = {
  folderId: string | null;
  cardSet: { id: string; label: string } | null;
};

const EMPTY_BREADCRUMB_CONTEXT: ExplorerBreadcrumbContext = {
  folderId: null,
  cardSet: null,
};

/**
 * パンくず用コンテキストが等しいかどうかを判定する
 */
const isSameBreadcrumbContext = (
  a: ExplorerBreadcrumbContext,
  b: ExplorerBreadcrumbContext,
): boolean =>
  a.folderId === b.folderId &&
  a.cardSet?.id === b.cardSet?.id &&
  a.cardSet?.label === b.cardSet?.label;

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
    useState<ExplorerBreadcrumbContext>(EMPTY_BREADCRUMB_CONTEXT);

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

  const notifyMainSidebarFolderSelection = useCallback((folderId: string | null) => {
    window.dispatchEvent(
      new CustomEvent("folders:selected-folder-changed", {
        detail: { folderId: folderId ?? null },
      }),
    );
  }, []);

  // 選択状態
  const [selectedFolderId, setSelectedFolderId] = useState(() => {
    if (isHomeOnlyMode) return null;
    if (queryFolderId) return queryFolderId;
    return localStorage.getItem("folder_selectedFolderId_work") || null;
  });

  // 選択状態の永続化
  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem("folder_selectedFolderId_work", selectedFolderId);
    } else {
      localStorage.removeItem("folder_selectedFolderId_work");
    }
  }, [selectedFolderId]);

  const [selectedItem, setSelectedItem] = useState(() => {
    if (isHomeOnlyMode) return null;
    if (queryCardId) return { type: "card", id: queryCardId };
    if (queryDocId) return { type: "document", id: queryDocId };
    return null;
  });
  const selectedFolderIdRef = useRef(selectedFolderId);
  const selectedItemRef = useRef(selectedItem);

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
  }, [selectedFolderId, selectedItem?.type, selectedItem?.id]);

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
        // state から URL へ反映中は、古い query で state を巻き戻さない
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
      setSelectedItem({ type: "card", id: queryCardId });
      return;
    }

    if (
      queryDocId &&
      (selectedItem?.type !== "document" || selectedItem.id !== queryDocId)
    ) {
      setSelectedItem({ type: "document", id: queryDocId });
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
      setExplorerBreadcrumbContext(EMPTY_BREADCRUMB_CONTEXT);
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

  // 作業モード（固定）はデスクトップのみ。モバイルは通常スクロールを維持する。
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

  // --- 選択ハンドラ ---
  const handleSelectFolderInWork = useCallback(
    (folderId: string | null) => {
      if (
        selectedFolderIdRef.current === folderId &&
        selectedItemRef.current === null
      ) {
        return;
      }

      forceResetWorkspaceScroll();
      setFolderSelectionNonce((n) => n + 1);
      notifyMainSidebarFolderSelection(folderId);
      setSelectedFolderId(folderId);
      setSelectedItem(null);
      setExplorerBreadcrumbContext(EMPTY_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = folderId;
      selectedItemRef.current = null;
    },
    [forceResetWorkspaceScroll, notifyMainSidebarFolderSelection],
  );

  const handleSelectCardInWork = useCallback((cardId) => {
    const current = selectedItemRef.current;
    if (current?.type === "card" && current.id === cardId) return;

    const nextItem = { type: "card", id: cardId };
    setSelectedItem(nextItem);
    selectedItemRef.current = nextItem;
  }, []);

  const handleSelectDocumentInWork = useCallback((docId) => {
    const current = selectedItemRef.current;
    if (current?.type === "document" && current.id === docId) return;

    const nextItem = { type: "document", id: docId };
    setSelectedItem(nextItem);
    selectedItemRef.current = nextItem;
  }, []);

  const handleSelectItemInWork = useCallback(
    (item: { type: string; id?: string } | null) => {
      if (!item) {
        if (selectedItemRef.current === null) return;
        setSelectedItem(null);
        selectedItemRef.current = null;
        return;
      }

      if (item.type === "card") {
        handleSelectCardInWork(item.id);
        return;
      }

      if (item.type === "document") {
        handleSelectDocumentInWork(item.id);
        return;
      }

      if (item.type === "directory") {
        notifyMainSidebarFolderSelection(null);
        setSelectedItem({ type: "directory" });
        setSelectedFolderId(null);
        selectedFolderIdRef.current = null;
        selectedItemRef.current = { type: "directory" };
        return;
      }

      if (item.type === "gallery") {
        notifyMainSidebarFolderSelection(null);
        setSelectedItem({ type: "gallery" });
        setSelectedFolderId(null);
        selectedFolderIdRef.current = null;
        selectedItemRef.current = { type: "gallery" };
        return;
      }

      if (item.type === "calendar") {
        notifyMainSidebarFolderSelection(null);
        setSelectedItem({ type: "calendar" });
        setSelectedFolderId(null);
        selectedFolderIdRef.current = null;
        selectedItemRef.current = { type: "calendar" };
        return;
      }

      if (item.type === "settings") {
        setIsSettingsOpen(true);
        return;
      }

      if (item.type === "trash") {
        notifyMainSidebarFolderSelection(null);
        setSelectedItem({ type: "trash" });
        setSelectedFolderId(null);
        selectedFolderIdRef.current = null;
        selectedItemRef.current = { type: "trash" };
      }
    },
    [
      handleSelectCardInWork,
      handleSelectDocumentInWork,
      notifyMainSidebarFolderSelection,
      setIsSettingsOpen,
    ],
  );

  const isLoading = foldersLoading || cardsLoading;

  const { setExtraCrumbs, registerFolderSelectHandler } =
    useBreadcrumbContext();
  const [navigateToSectionListToken, setNavigateToSectionListToken] =
    useState(0);
  const foldersRef = useRef(folders);

  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  useEffect(() => {
    registerFolderSelectHandler((folderId) => {
      notifyMainSidebarFolderSelection(folderId ?? null);
      setSelectedFolderId(folderId ?? null);
      setSelectedItem(null);
      setExplorerBreadcrumbContext(EMPTY_BREADCRUMB_CONTEXT);
      selectedFolderIdRef.current = folderId ?? null;
      selectedItemRef.current = null;

      // パンくずの「フォルダ一覧」クリック時に、大元のフォルダ一覧へ戻す
      if (!folderId) {
        setNavigateToSectionListToken((n) => n + 1);
        return;
      }

      // ルート直下フォルダを選んだときもフォルダ一覧側を同期
      const folder = foldersRef.current.find((f) => f.id === folderId);
      if (folder && !folder.parentFolderId) {
        setNavigateToSectionListToken((n) => n + 1);
      }
    });
  }, [registerFolderSelectHandler, notifyMainSidebarFolderSelection]);

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const cardById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const documentById = useMemo(() => {
    const map = new Map();
    for (const doc of documents) {
      const key = doc.id || doc.documentId;
      if (key) map.set(key, doc);
    }
    return map;
  }, [documents]);

  const handleExplorerBreadcrumbContextChange = useCallback(
    (next: ExplorerBreadcrumbContext) => {
      setExplorerBreadcrumbContext((prev) =>
        isSameBreadcrumbContext(prev, next) ? prev : next,
      );
    },
    [],
  );

  // パンくずの追加項目（フォルダ階層、カード/ドキュメント名。カードセット名）を計算
  const extraCrumbs = useMemo(() => {
    const crumbs = [];
    const breadcrumbFolderId =
      selectedFolderId ?? explorerBreadcrumbContext.folderId;

    // フォルダ階層を構築（祖先 → 選択フォルダ）
    if (breadcrumbFolderId) {
      const path = [];
      let cur = folderById.get(breadcrumbFolderId);

      while (cur) {
        path.unshift(cur);
        cur = cur.parentFolderId ? folderById.get(cur.parentFolderId) : null;
      }

      path.forEach((folder) => {
        crumbs.push({
          label: folder.folderName,
          to: `/folders?folderId=${folder.id}`,
          folderId: folder.id,
        });
      });
    }

    // カードまたはドキュメントのクラム
    if (selectedItem?.type === "card") {
      const card = cardById.get(selectedItem.id);
      if (card) {
        const label =
          card.title?.trim() ||
          getCardText(card, "question").trim().slice(0, 20) ||
          "カード";
        crumbs.push({ label });
      }
    } else if (selectedItem?.type === "document") {
      const doc = documentById.get(selectedItem.id);
      if (doc) {
        crumbs.push({ label: doc.title || doc.fileName || "ドキュメント" });
      }
    }

    if (explorerBreadcrumbContext.cardSet?.label) {
      crumbs.push({ label: explorerBreadcrumbContext.cardSet.label });
    }

    return crumbs;
  }, [
    selectedFolderId,
    explorerBreadcrumbContext,
    selectedItem,
    folderById,
    cardById,
    documentById,
  ]);

  // 計算されたパンくずをコンテキストに反映
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
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <TreeViewLayout
            folders={folders}
            cards={cards}
            documents={documents as DocumentItem[]}
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