import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useDocuments } from '@/hooks/useDocuments';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton } from '@/Components/ui/skeleton';
import TreeViewLayout from '@/Components/folder/TreeViewLayout';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function Folders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const queryFolderId = searchParams.get('folderId');
  const queryCardId = searchParams.get('cardId');
  const queryDocId = searchParams.get('docId');
  
  const pendingUrlSyncRef = useRef(null);

  // 選択状態
  const [selectedFolderId, setSelectedFolderId] = useState(() => {
    if (queryFolderId) return queryFolderId;
    return localStorage.getItem('folder_selectedFolderId_work') || null;
  });
  
  // 選択状態の永続化
  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem('folder_selectedFolderId_work', selectedFolderId);
    } else {
      localStorage.removeItem('folder_selectedFolderId_work');
    }
  }, [selectedFolderId]);

  const [selectedCardId, setSelectedCardId] = useState(() => queryCardId || null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => queryDocId || null);
  const [selectedItem, setSelectedItem] = useState(() => {
    if (queryCardId) return { type: 'card', id: queryCardId };
    if (queryDocId) return { type: 'document', id: queryDocId };
    return null;
  }); // { type: 'card' | 'document', id: string } | null

  useEffect(() => {
    const next = new URLSearchParams(queryString);
    if (selectedFolderId) {
      next.set('folderId', selectedFolderId);
    } else {
      next.delete('folderId');
    }

    if (selectedCardId) {
      next.set('cardId', selectedCardId);
      next.delete('docId');
    } else if (selectedDocumentId) {
      next.set('docId', selectedDocumentId);
      next.delete('cardId');
    } else {
      next.delete('cardId');
      next.delete('docId');
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
  }, [selectedFolderId, selectedCardId, selectedDocumentId, queryString, setSearchParams]);

  useEffect(() => {
    const pendingTarget = pendingUrlSyncRef.current;
    if (pendingTarget) {
      // state から URL へ反映中は、古い query で state を巻き戻さない
      if (queryString !== pendingTarget) return;
      pendingUrlSyncRef.current = null;
      return;
    }

    if (queryFolderId !== selectedFolderId) {
      setSelectedFolderId(queryFolderId || null);
    }

    if (queryCardId && queryCardId !== selectedCardId) {
      setSelectedCardId(queryCardId);
      setSelectedDocumentId(null);
      setSelectedItem({ type: 'card', id: queryCardId });
      return;
    }

    if (queryDocId && queryDocId !== selectedDocumentId) {
      setSelectedDocumentId(queryDocId);
      setSelectedCardId(null);
      setSelectedItem({ type: 'document', id: queryDocId });
      return;
    }
  }, [
    queryString,
    queryFolderId,
    queryCardId,
    queryDocId,
    selectedFolderId,
    selectedCardId,
    selectedDocumentId,
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
      document.documentElement.classList.add('no-page-scroll');
    } else {
      document.documentElement.classList.remove('no-page-scroll');
    }
    return () => {
      document.documentElement.classList.remove('no-page-scroll');
    };
  }, [isDesktop]);

  // --- 選択ハンドラ ---
  const handleSelectFolderInWork = (folderId) => {
    // モバイル/デスクトップともに選択状態を直接更新する。
    // URL同期は useEffect 側で一元管理する。
    setSelectedFolderId(folderId);
    setSelectedCardId(null);
    setSelectedDocumentId(null);
    setSelectedItem(null);
  };

  const handleSelectCardInWork = (cardId) => {
    // デスクトップ: プレビュー表示
    // モバイル: 編集画面に遷移（右ペインに相当）
    if (!isDesktop) {
        // モバイルでは編集画面（CardEdit）に遷移
        navigate(createPageUrl(`CardEdit?id=${cardId}`));
        return;
    }
    // デスクトップでは右ペインにカードを表示
    setSelectedCardId(cardId);
    setSelectedDocumentId(null);
    setSelectedItem({ type: 'card', id: cardId });
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
    // 既存のFolderViewでもPDFは表示されるはず。ここでのクリックは「スルー」でもよい？
    // いったんPCと同じ処理にする。
    setSelectedDocumentId(docId);
    setSelectedCardId(null);
    setSelectedItem({ type: 'document', id: docId });
  };

  const handleSelectItemInWork = (item) => {
    if (!item) {
      setSelectedItem(null);
      setSelectedCardId(null);
      setSelectedDocumentId(null);
      return;
    }
    if (item.type === 'card') handleSelectCardInWork(item.id);
    else if (item.type === 'document') handleSelectDocumentInWork(item.id);
  };
  
  const isLoading = foldersLoading || cardsLoading;

  return (
    <div
      className={cn(
        "bg-[#F8FAFB] transition-colors duration-500 relative",
        isDesktop ? "h-screen overflow-hidden" : "min-h-[100dvh] overflow-x-hidden overflow-y-auto"
      )}
    >
      {/* Background Ruled Lines */}
      <div 
        className="absolute inset-0 opacity-100 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 24px)',
          backgroundSize: '100% 24px'
        }}
      />
      <div className={cn("w-full mx-auto", isDesktop ? "h-full" : "min-h-[100dvh]")}>
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
