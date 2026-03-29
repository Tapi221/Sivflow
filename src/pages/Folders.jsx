import React, { useState, useEffect, useRef, useCallback } from "react";
import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/card/useCards";
import { useFolders } from "@/hooks/folder/useFolders";
import { useDocuments } from "@/hooks/platform/useDocuments";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { Skeleton } from "@/components/ui/skeleton";
import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { cn } from "@/lib/utils";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";

export default function Folders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const { setIsSettingsOpen } = useSettingsQueryParam(
    searchParams,
    setSearchParams,
  );
  const isDesktop = useIsDesktopRuntime();
  const queryFolderId = searchParams.get("folderId");
  const queryCardId = searchParams.get("cardId");
  const queryDocId = searchParams.get("docId");

  const pendingUrlSyncRef = useRef(null);
  const [folderSelectionNonce, setFolderSelectionNonce] = useState(0);

  const forceResetWorkspaceScroll = useCallback(() => {
    const reset = () => {
      const main = document.querySelector(".app-layout__main");
      if (main instanceof HTMLElement) {
        main.scrollTop = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();
    window.requestAnimationFrame(() => {
      reset();
      window.requestAnimationFrame(reset);
    });
  }, []);

  const notifyMainSidebarFolderSelection = useCallback((folderId) => {
    window.dispatchEvent(
      new CustomEvent("folders:selected-folder-changed", {
        detail: { folderId: folderId ?? null },
      }),
    );
  }, []);

  const syncSelectionToUrl = useCallback(
    (nextFolderId, nextItem) => {
      const next = new URLSearchParams(queryString);

      if (nextFolderId) {
        next.set("folderId", nextFolderId);
      } else {
        next.delete("folderId");
      }

      if (nextItem?.type === "card") {
        next.set("cardId", nextItem.id);
        next.delete("docId");
      } else if (nextItem?.type === "document") {
        next.set("docId", nextItem.id);
        next.delete("cardId");
      } else {
        next.delete("cardId");
        next.delete("docId");
      }

      const target = next.toString();
      if (queryString !== target) {
        pendingUrlSyncRef.current = target;
        setSearchParams(next, { replace: true });
      } else if (pendingUrlSyncRef.current === queryString) {
        pendingUrlSyncRef.current = null;
      }
    },
    [queryString, setSearchParams],
  );

  // 選択状態
  const [selectedFolderId, setSelectedFolderId] = useState(() => {
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
    if (queryCardId) return { type: "card", id: queryCardId };
    if (queryDocId) return { type: "document", id: queryDocId };
    return null;
  });

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
  }, [
    selectedFolderId,
    selectedItem?.type,
    selectedItem?.id,
    queryString,
  ]);

  useEffect(() => {
    const next = new URLSearchParams(queryString);

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

    if (current !== target) {
      pendingUrlSyncRef.current = target;
      setSearchParams(next, { replace: true });
      return;
    }

    if (pendingUrlSyncRef.current === current) {
      pendingUrlSyncRef.current = null;
    }
  }, [selectedFolderId, selectedItem, queryString, setSearchParams]);

  useEffect(() => {
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
  }, [
    queryString,
    queryFolderId,
    queryCardId,
    queryDocId,
    selectedFolderId,
    selectedItem,
  ]);

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
  const handleSelectFolderInWork = (folderId) => {
    forceResetWorkspaceScroll();
    setFolderSelectionNonce((n) => n + 1);
    notifyMainSidebarFolderSelection(folderId);
    setSelectedFolderId(folderId);
    setSelectedItem(null);
    syncSelectionToUrl(folderId, null);
  };

  const handleSelectCardInWork = (cardId) => {
    const nextItem = { type: "card", id: cardId };
    setSelectedItem(nextItem);
    syncSelectionToUrl(selectedFolderId, nextItem);
  };

  const handleSelectDocumentInWork = (docId) => {
    const nextItem = { type: "document", id: docId };
    setSelectedItem(nextItem);
    syncSelectionToUrl(selectedFolderId, nextItem);
  };

  const handleSelectItemInWork = (item) => {
    if (!item) {
      setSelectedItem(null);
      syncSelectionToUrl(selectedFolderId, null);
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
      syncSelectionToUrl(null, null);
      return;
    }

    if (item.type === "gallery") {
      notifyMainSidebarFolderSelection(null);
      setSelectedItem({ type: "gallery" });
      setSelectedFolderId(null);
      syncSelectionToUrl(null, null);
      return;
    }

    if (item.type === "calendar") {
      notifyMainSidebarFolderSelection(null);
      setSelectedItem({ type: "calendar" });
      setSelectedFolderId(null);
      syncSelectionToUrl(null, null);
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
      syncSelectionToUrl(null, null);
    }
  };

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
      syncSelectionToUrl(folderId ?? null, null);

      // パンくずの「セクション一覧」クリック時に、大元のフォルダ一覧へ戻す
      if (!folderId) {
        setNavigateToSectionListToken((n) => n + 1);
        return;
      }

      // ルート直下フォルダを選んだときもセクション一覧側を同期
      const folder = foldersRef.current.find((f) => f.id === folderId);
      if (folder && !folder.parentFolderId) {
        setNavigateToSectionListToken((n) => n + 1);
      }
    });
  }, [
    registerFolderSelectHandler,
    syncSelectionToUrl,
    notifyMainSidebarFolderSelection,
  ]);

  useEffect(() => {
    const crumbs = [ ];

    // フォルダ階層を構築（祖先 → 選択フォルダ）
    if (selectedFolderId) {
      const path = [];
      let cur = folders.find((f) => f.id === selectedFolderId);

      while (cur) {
        path.unshift(cur);
        cur = folders.find((f) => f.id === cur.parentFolderId);
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
      const card = cards.find((c) => c.id === selectedItem.id);
      if (card) {
        const label =
          card.title?.trim() ||
          card.questionText?.trim().slice(0, 20) ||
          "カード";
        crumbs.push({ label });
      }
    } else if (selectedItem?.type === "document") {
      const doc = documents.find(
        (d) => (d.id || d.documentId) === selectedItem.id,
      );
      if (doc) {
        crumbs.push({ label: doc.title || doc.fileName || "ドキュメント" });
      }
    }

    setExtraCrumbs(crumbs);

    return () => {
      setExtraCrumbs([]);
    };
  }, [selectedFolderId, selectedItem, folders, cards, documents, setExtraCrumbs]);

  return (
    <div
      className={cn(
        "bg-[#F8FAFB] transition-colors duration-500 relative flex min-h-0 h-full flex-col",
        isDesktop
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
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <TreeViewLayout
            folders={folders}
            cards={cards}
            documents={documents}
            selectedFolderId={selectedFolderId}
            selectedItem={selectedItem}
            selectedCardId={selectedCardId}
            selectedDocumentId={selectedDocumentId}
            onFolderSelect={handleSelectFolderInWork}
            onItemSelect={handleSelectItemInWork}
            onCardUpdated={() => {
              // カード更新後の処理
            }}
            navigateToSectionListToken={navigateToSectionListToken}
            folderSelectionNonce={folderSelectionNonce}
          />
        )}
      </div>
    </div>
  );
}







