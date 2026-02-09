import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import { normalizeCard } from '../utils';
import { normalizeMemoryStability } from '../utils/reviewUtils';
import { useUserSettings, DEFAULT_SETTINGS } from './useUserSettings';
import type { Card } from '../types';

// 空カード判定用のヘルパー関数（createCard と updateCard で共通利用）
function hasBlocksContent(blocks?: any[]): boolean {
  return blocks?.some(b => {
    if (b.type === 'text' || b.type === 'memo') return b.content?.trim();
    if (b.type === 'code') return b.code?.code?.trim();
    if (b.type === 'image') return b.images?.length > 0;
    if (b.type === 'audio') return b.audios?.length > 0;
    if (b.type === 'math') return b.math?.latex?.trim();
    if (b.type === 'reference') return b.references?.some((r: any) => r.url?.trim());
    return false;
  }) || false;
}

function isCardCompletelyEmpty(cardData: Partial<Card>): boolean {
  return (
    !cardData.title?.trim() && 
    !cardData.tags?.length && 
    !hasBlocksContent(cardData.questionBlocks) && 
    !hasBlocksContent(cardData.answerBlocks) &&
    !cardData.questionText?.trim() && // Legacy support
    !cardData.answerText?.trim()      // Legacy support
  );
}

export function useCards(folderId?: string) {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Use settings to determine init schedule
  const { settings } = useUserSettings();

  // useLiveQueryでリアクティブにカードを取得
  const rawCards = useLiveQuery(
    async () => {
      try {
        if (!currentUser) return [];
        const db = await getLocalDb(currentUser.uid);
        console.log(`[Diagnostic] useCards: Fetching from DB ${db.name}`);
        const all = await db.getAllCards(); 
        console.log(`[Diagnostic] useCards: TOTAL CARDS IN DEXIE (Normalized) = ${all.length}`);
        return all;
      } catch (err: any) {
        console.error(`[useCards] Error: ${err.message}`);
        setError(err.message);
        return [];
      }
    },

    [currentUser] // localDb.name is removed as dependency because it's now internal to liveQuery
  );

  // ... (rest of the hook code, I'll use multi_replace for accuracy if needed, but let's try one big block or smaller chunks)
  // Actually, I'll do specific chunks for safety.

  // 正規化・フィルタ・ソートはuseMemoで処理
  const cards = useMemo(() => {
    if (!rawCards || rawCards.length === 0) return [];
    
    let normalized = rawCards.map(normalizeCard);
    
    // isDeleted が false のもののみ
    normalized = normalized.filter(c => !c.isDeleted);
    
    // folderId でfilter
    if (folderId) {
      normalized = normalized.filter(c => c.folderId === folderId);
    }
    
    // orderIndex でソート
    normalized.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    return normalized;
  }, [rawCards, folderId]);

  // useLiveQueryはundefinedを返すことがあるのでloadingを判定
  const loading = rawCards === undefined;

  const createCard = async (cardData: Partial<Card>) => {
    if (!currentUser) throw new Error('認証が必要です');

    console.log('[createCard] START', { folderId: cardData.folderId, title: cardData.title });

    // Validation: カードが完全に空（タイトルもコンテンツもタグもない）場合は保存を拒否
    const hasBlocksContent = (blocks?: any[]) => {
      return blocks?.some(b => {
        if (b.type === 'text' || b.type === 'memo') return b.content?.trim();
        if (b.type === 'code') return b.code?.code?.trim();
        if (b.type === 'image') return b.images?.length > 0;
        if (b.type === 'audio') return b.audios?.length > 0;
        if (b.type === 'math') return b.math?.latex?.trim();
        if (b.type === 'reference') return b.references?.some((r: any) => r.url?.trim());
        return false;
      }) || false;
    };

    const isCompletelyEmpty = 
      !cardData.title?.trim() && 
      !cardData.tags?.length && 
      !hasBlocksContent(cardData.questionBlocks) && 
      !hasBlocksContent(cardData.answerBlocks) &&
      !cardData.questionText?.trim() && // Legacy support
      !cardData.answerText?.trim();   // Legacy support

    if (isCompletelyEmpty) {
      console.error('[useCards] Refusing to create completely empty card');
      throw new Error('カードの内容を入力してください。');
    }

    // Force fetch settings to ensure freshness
    const db = await getLocalDb(currentUser.uid);
    const userSettings = await db.userSettings.get(currentUser.uid);
    const effectiveSettings = { ...DEFAULT_SETTINGS, ...(userSettings || {}) };
    const startNextDay = effectiveSettings.reviewStartNextDay ?? true;

    const now = new Date();
    // orderIndex: 既存カードとの競合を避け、時間軸での並びを保証するタイムスタンプベース
    const orderIndex = cardData.orderIndex ?? (Date.now() * 10000 + Math.floor(Math.random() * 10000));
    
    // 表示用のQ番号は既存のカード数+1とする（orderIndexが巨大な数値になるため）
    const folderCards = cards.filter(c => c.folderId === (cardData.folderId || ''));
    const questionNumber = cardData.questionNumber ?? `Q${folderCards.length + 1}`;
    const id = crypto.randomUUID();

    const nextReviewDate = (() => {
      // If manually set, use it
      if (cardData.nextReviewDate) return cardData.nextReviewDate;
      
      const d = new Date(now);
      if (startNextDay) {
          d.setDate(d.getDate() + 1); // Schedule for tomorrow
      }
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const newCard: Card = {
      id,
      userId: currentUser.uid,
      deviceId: cardData.deviceId || 'web',
      folderId: cardData.folderId || '',
      orderIndex,
      questionNumber,
      title: cardData.title || '',
      isDraft: cardData.isDraft ?? true,
      isDeleted: false,
      hasUncertainty: cardData.hasUncertainty ?? false,
      isBookmarked: cardData.isBookmarked ?? false,
      isCompleted: cardData.isCompleted ?? false,
      isSilent: cardData.isSilent ?? false,
      questionText: cardData.questionText || '',
      questionImages: cardData.questionImages || [],
      questionAudios: cardData.questionAudios || [],
      questionCode: cardData.questionCode || null,
      questionMemo: cardData.questionMemo || '',
      questionMarked: cardData.questionMarked || '',
      answerText: cardData.answerText || '',
      answerImages: cardData.answerImages || [],
      answerAudios: cardData.answerAudios || [],
      answerCode: cardData.answerCode || null,
      answerMemo: cardData.answerMemo || '',
      answerMarked: cardData.answerMarked || '',
      // Ensure blocks are carried over from cardData
      questionBlocks: cardData.questionBlocks || [],
      answerBlocks: cardData.answerBlocks || [],
      memoryStability: 0,
      currentLevel: cardData.currentLevel ?? null,
      nextReviewDate,
      createdAt: now,
      updatedAt: now,
    };

    try {
      console.log('[createCard] BEFORE_LOCALDB_ADD', { table: 'cards', cardId: newCard.id });
      const db = await getLocalDb(currentUser.uid);
      await db.addItem('cards', newCard);
      console.log('[createCard] AFTER_LOCALDB_ADD', { table: 'cards', cardId: newCard.id, status: 'success' });
      return newCard;
    } catch (err) {
      console.error('[createCard] ERROR during LocalDB add', { table: 'cards', cardId: newCard.id, error: err });
      throw err;
    }
  };

  const updateCard = async (id: string, data: Partial<Card>) => {
    if (!currentUser) throw new Error('認証が必要です');

    const db = await getLocalDb(currentUser.uid);
    
    // 更新後のカード状態をシミュレーション
    const currentCard = cards.find(c => c.id === id);
    if (!currentCard) {
      console.warn('[updateCard] Card not found:', id);
      return;
    }
    
    const mergedCard = { ...currentCard, ...data };
    
    // 更新後に空になる場合は削除
    if (isCardCompletelyEmpty(mergedCard)) {
      console.log('[updateCard] Card became empty after update, deleting:', id);
      await deleteCard(id);
      return;
    }
    
    // 通常の更新処理
    await db.updateItem('cards', id, {
      ...data,
      updatedAt: new Date(),
    });
  };

  const deleteCard = async (id: string) => {
    if (!currentUser) throw new Error('認証が必要です');
    // ソフト削除: ACTIVE → TRASHED
    // isDeleted と deletedAt を同時に設定
    const db = await getLocalDb(currentUser.uid);
    await db.softDelete('cards', id);
  };

  const toggleFlag = async (id: string, flag: 'hasUncertainty' | 'isCompleted' | 'isSilent' | 'isBookmarked') => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    
    await updateCard(id, { [flag]: !card[flag] });
  };

  /**
   * カードを別フォルダへ移動
   * - folderId を更新
   * - 移動先フォルダの末尾に追加（orderIndex を最大値+1に設定）
   */
  const moveCardToFolder = async (cardId: string, targetFolderId: string) => {
    if (!currentUser) throw new Error('認証が必要です');
    
    const db = await getLocalDb(currentUser.uid);
    
    // 移動先フォルダ内の最大 orderIndex を取得
    const allCards = await db.getAllCards();
    const targetFolderCards = allCards.filter(c => c.folderId === targetFolderId && !c.isDeleted);
    const maxOrderIndex = targetFolderCards.reduce((max, c) => Math.max(max, c.orderIndex || 0), 0);
    
    // カードを更新
    await db.updateItem('cards', cardId, {
      folderId: targetFolderId,
      orderIndex: maxOrderIndex + 1,
      updatedAt: new Date(),
    });
  };

  /**
   * フォルダ内のカードを並び替え
   * - cardIds の順序で orderIndex を 0, 1, 2, ... n-1 に振り直す
   */
  const reorderCards = async (folderId: string, cardIds: string[]) => {
    if (!currentUser) throw new Error('認証が必要です');
    
    const db = await getLocalDb(currentUser.uid);
    
    // 各カードの orderIndex を更新
    const updates = cardIds.map((cardId, index) => 
      db.updateItem('cards', cardId, {
        orderIndex: index,
        updatedAt: new Date(),
      })
    );
    
    await Promise.all(updates);
  };

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    toggleFlag,
    moveCardToFolder,
    reorderCards,
  };
}
