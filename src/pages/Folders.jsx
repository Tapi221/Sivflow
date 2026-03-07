import React, { useState, useEffect, useRef } from "react";
import { getPageRuledBg } from "@/components/card/frame/ruledStyles";
import { useSearchParams } from "react-router-dom";
import { useCards } from "@/hooks/useCards";
import { useFolders } from "@/hooks/useFolders";
import { useDocuments } from "@/hooks/useDocuments";
import { useIsDesktopRuntime } from "@/hooks/useIsDesktopRuntime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import TreeViewLayout from "@/components/folder/TreeViewLayout";
import { cn } from "@/lib/utils";
import { useSettingsQueryParam } from "@/hooks/useSettingsQueryParam";

export default function Folders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const { setIsSettingsOpen } = useSettingsQueryParam(
    searchParams,
    setSearchParams,
  );
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktopRuntime();
  const queryFolderId = searchParams.get("folderId");
  const queryCardId = searchParams.get("cardId");
  const queryDocId = searchParams.get("docId");

  const pendingUrlSyncRef = useRef(null);

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
  }); // { type: 'card' | 'document', id: string } | null

  const selectedCardId = selectedItem?.type === "card" ? selectedItem.id : null;
  const selectedDocumentId =
    selectedItem?.type === "document" ? selectedItem.id : null;

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
  const { updateFolder } = useFolders();

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => updateFolder(id, data),
  });

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
    // モバイル/デスクトップともに選択状態を直接更新する。
    // URL同期は useEffect 側で一元管理する。
    setSelectedFolderId(folderId);
    setSelectedItem(null);
  };

  const handleSelectCardInWork = (cardId) => {
    // PC/モバイル共通で右ペインの編集UIを表示する
    setSelectedItem({ type: "card", id: cardId });
  };

  const handleSelectDocumentInWork = (docId) => {
    // PDF等も同様に、モバイルなら開く必要があるかもしれないが、
    // 現状PDFビューアーは埋め込みのみか？
    // いったんPCと同じ挙動（選択）にしておくが、
    // Layout側でRightPaneが隠れるため、何も起きないように見える可能性がある。
    // モバイルでPDFを開く手段が必要。
    // ここでは単純に「何もしない」か「遷移」だが、DocumentView的なものはないかもしれない。
    // RightPane相当のものを別画面で開く必要がある。
    // とりあえずカード同様に状態だけ更新するが、
    // TreeViewLayout側でモバイル時にRightPaneがないので、
    // ユーザーは「開けない」ことになる。
    // (実装計画には詳細がなかったが、今回はフォルダ一覧の統一が主眼)
    // 既存のFolders画面でもPDFは表示されるはず。ここでのクリックは「スルー」でもよい？
    // いったんPCと同じ処理にする。
    setSelectedItem({ type: "document", id: docId });
  };

  const handleSelectItemInWork = (item) => {
    if (!item) {
      setSelectedItem(null);
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
      setSelectedItem({ type: "directory" });
      setSelectedFolderId(null);
      return;
    }
    if (item.type === "gallery") {
      setSelectedItem({ type: "gallery" });
      setSelectedFolderId(null);
      return;
    }
    if (item.type === "calendar") {
      setSelectedItem({ type: "calendar" });
      setSelectedFolderId(null);
      return;
    }
    if (item.type === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    if (item.type === "trash") {
      setSelectedItem({ type: "trash" });
      setSelectedFolderId(null);
    }
  };

  const isLoading = foldersLoading || cardsLoading;

  return (
    <div
      className={cn(
        "bg-[#F8FAFB] transition-colors duration-500 relative",
        isDesktop
          ? "h-full overflow-hidden"
          : "h-full overflow-x-hidden overflow-y-auto",
      )}
    >
      {/* Background Ruled Lines */}
      <div
        className="absolute inset-0 opacity-100 pointer-events-none z-0"
        style={{
          ...getPageRuledBg(),
        }}
      />
      <div className="w-full mx-auto h-full">
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
          />
        )}
      </div>
    </div>
  );
}
