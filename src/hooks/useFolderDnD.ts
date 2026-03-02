/**
 * useFolderDnD - フォルダツリー用DnDロジック
 * 
 * DragDropContext のonDragEndハンドラを提供
 */
import { useCallback } from 'react';

interface UseFolderDnDProps {
  cards: any[];
  moveCardToFolder: (cardId: string, targetFolderId: string) => Promise<void>;
  reorderCards: (folderId: string, cardIds: string[]) => Promise<void>;
}

/**
 * Droppable ID 形式:
 * - folder-drop:{folderId} - カードを別フォルダへ移動する際のドロップ先
 * - card-list:{folderId}   - 同一フォルダ内でカードを並び替える際のドロップ先
 * 
 * Draggable ID 形式:
 * - card:{cardId} - ドラッグ可能なカード
 */

// ヘルパー: Droppable ID からフォルダIDを抽出
function extractFolderId(droppableId: string): string | null {
  if (droppableId.startsWith('folder-drop:')) {
    return droppableId.replace('folder-drop:', '');
  }
  if (droppableId.startsWith('card-list:')) {
    return droppableId.replace('card-list:', '');
  }
  return null;
}

// ヘルパー: Draggable ID からカードIDを抽出
function extractCardId(draggableId: string): string | null {
  if (draggableId.startsWith('card:')) {
    return draggableId.replace('card:', '');
  }
  return null;
}

export function useFolderDnD({
  cards,
  moveCardToFolder,
  reorderCards,
}: UseFolderDnDProps) {
  
  const onDragEnd = useCallback(async (result: {
    source: { droppableId: string; index: number };
    destination: { droppableId: string; index: number } | null;
    draggableId: string;
  }) => {
    const { source, destination, draggableId } = result;
    
    // ドロップ先がない場合は何もしない
    if (!destination) return;
    
    // 同じ位置にドロップした場合は何もしない
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    const cardId = extractCardId(draggableId);
    if (!cardId) return;
    
    const card = cards.find(c => (c.id || c.cardId) === cardId);
    if (!card) return;
    
    const sourceFolderId = extractFolderId(source.droppableId);
    const destFolderId = extractFolderId(destination.droppableId);
    
    // パターン1: フォルダへの移動（folder-drop: にドロップ）
    if (destination.droppableId.startsWith('folder-drop:') && destFolderId) {
      // 同じフォルダへの移動は無視
      const currentFolderId = card.folderId || null;
      if (currentFolderId === destFolderId) return;
      
      try {
        await moveCardToFolder(cardId, destFolderId);
      } catch (e) {
        console.error('Failed to move card to folder:', e);
      }
      return;
    }
    
    // パターン2: 同一フォルダ内での並び替え（card-list: 間でドロップ）
    if (
      source.droppableId.startsWith('card-list:') &&
      destination.droppableId.startsWith('card-list:') &&
      source.droppableId === destination.droppableId &&
      sourceFolderId
    ) {
      // 現在のフォルダ内のカードを取得（orderIndex順）
      const folderCards = cards
        .filter(c => (c.folderId || null) === sourceFolderId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      
      const cardIds = folderCards.map(c => c.id || c.cardId);
      
      // 並び替え
      const [removed] = cardIds.splice(source.index, 1);
      cardIds.splice(destination.index, 0, removed);
      
      try {
        await reorderCards(sourceFolderId, cardIds);
      } catch (e) {
        console.error('Failed to reorder cards:', e);
      }
      return;
    }
  }, [cards, moveCardToFolder, reorderCards]);
  
  return {
    onDragEnd,
  };
}

// ヘルパー関数をエクスポート
export const DnDHelpers = {
  createCardDroppableId: (folderId: string) => `folder-drop:${folderId}`,
  createCardListDroppableId: (folderId: string) => `card-list:${folderId}`,
  createCardDraggableId: (cardId: string) => `card:${cardId}`,
  extractFolderId,
  extractCardId,
};
