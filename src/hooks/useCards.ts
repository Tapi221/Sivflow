import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import { normalizeCard } from '../utils';
import { normalizeMemoryStability } from '../utils/reviewUtils';
import { useUserSettings, DEFAULT_SETTINGS } from './useUserSettings';
import type { Card } from '../types';
import { normalizeInkDocument } from '@/components/ink/inkTypes';
import { DEFAULT_LAYOUT_ROWS, normalizeLayoutRows } from '@/domain/card/extraRows';

// 空カード判定用のヘルパー関数（createCard と updateCard で共通利用）
function isCardDeleted(
  card: Partial<Card> & {
    is_deleted?: boolean;
    deleted?: boolean;
    deletedAt?: unknown;
    deleted_at?: unknown;
  }
) {
  const deletedAt = (card as any).deletedAt ?? (card as any).deleted_at;
  return Boolean(card.isDeleted ?? card.is_deleted ?? (card as any).deleted ?? deletedAt);
}

function hasBlocksContent(blocks?: unknown[]): boolean {
  return blocks?.some(b => {
    if (b.type === 'text') return b.content?.trim();
    if (b.type === 'markdown') return b.markdown?.trim();
    if (b.type === 'code') return b.code?.code?.trim();
    if (b.type === 'image') return b.images?.length > 0;
    if (b.type === 'audio') return b.audios?.length > 0;
    if (b.type === 'math') return b.math?.latex?.trim();
    if (b.type === 'reference') return b.references?.some((r: unknown) => r.url?.trim());
    return false;
  }) || false;
}

export function useCards(folderId?: string) {
  const { currentUser } = useAuth();
  const [error] = useState<string | null>(null);
  
  // Use settings to determine init schedule
  const { settings } = useUserSettings();

  // useLiveQueryでリアクティブにカードを取得
  const rawCards = useLiveQuery(
    async () => {
      try {
        if (!currentUser) return [];
        const db = await getLocalDb(currentUser.uid);
        const all = await db.getAllCards(); 
        return all;
      } catch (err: unknown) {
        console.error(`[useCards] Error: ${err.message}`);
        return [];
      }
    },

    [currentUser?.uid] // localDb.name is removed as dependency because it's now internal to liveQuery
  );

  // ... (rest of the hook code, I'll use multi_replace for accuracy if needed, but let's try one big block or smaller chunks)
  // Actually, I'll do specific chunks for safety.

  // 正規化・フィルタ・ソートはuseMemoで処理
  const cards = useMemo(() => {
    if (!rawCards || rawCards.length === 0) return [];
    
    let normalized = rawCards.map(normalizeCard);
    
    // 削除済み（legacy is_deleted 含む）を除外
    normalized = normalized.filter((c) => !isCardDeleted(c as Partial<Card> & { is_deleted?: boolean }));
    
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

    // Validation: カードが完全に空（タイトルもコンテンツもタグもない）場合は保存を拒否
    const hasBlocksContent = (blocks?: unknown[]) => {
      return blocks?.some(b => {
        if (b.type === 'text') return b.content?.trim();
        if (b.type === 'markdown') return b.markdown?.trim();
        if (b.type === 'code') return b.code?.code?.trim();
        if (b.type === 'image') return b.images?.length > 0;
        if (b.type === 'audio') return b.audios?.length > 0;
        if (b.type === 'math') return b.math?.latex?.trim();
        if (b.type === 'reference') return b.references?.some((r: unknown) => r.url?.trim());
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

    // 新規作成時はタイトルが空であることを許容する（あとで編集するため）
    // そのため、作成時のバリデーションはスキップする
    /*
    if (isCompletelyEmpty) {
      console.error('[useCards] Refusing to create completely empty card');
      throw new Error('カードの内容を入力してください。');
    }
    */

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

    const normalizedReviewLogs = Array.isArray(cardData.reviewLogs)
      ? [...cardData.reviewLogs].sort(
          (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
        )
      : [];

    const newCard: Card = {
      id,
      userId: currentUser.uid,
      deviceId: cardData.deviceId || 'web',
      folderId: cardData.folderId || '',
      orderIndex,
      questionNumber,
      title: cardData.title || '',
      isDraft: cardData.isDraft ?? false,
      // 新規作成時は必ず isDeleted: false で保存
      isDeleted: false,
      hasUncertainty: cardData.hasUncertainty ?? false,
      isBookmarked: cardData.isBookmarked ?? false,
      isCompleted: cardData.isCompleted ?? false,
      isSilent: cardData.isSilent ?? false,
      questionText: cardData.questionText || '',
      questionImages: cardData.questionImages || [],
      questionAudios: cardData.questionAudios || [],
      questionCode: cardData.questionCode || null,
      questionMarked: cardData.questionMarked || '',
      answerText: cardData.answerText || '',
      answerImages: cardData.answerImages || [],
      answerAudios: cardData.answerAudios || [],
      answerCode: cardData.answerCode || null,
      answerMarked: cardData.answerMarked || '',
      // Ensure blocks are carried over from cardData
      questionBlocks: cardData.questionBlocks || [],
      answerBlocks: cardData.answerBlocks || [],
      layoutRows: normalizeLayoutRows(
        (cardData as any).layoutRows ?? (cardData as any).layout_rows ?? DEFAULT_LAYOUT_ROWS
      ),
      inkQuestion: normalizeInkDocument(cardData.inkQuestion),
      inkAnswer: normalizeInkDocument(cardData.inkAnswer),
      memoryStability: 0,
      currentLevel: cardData.currentLevel ?? null,
      nextReviewDate,
      createdAt: now,
      updatedAt: now,
      tags: cardData.tags || [],
      ...(Array.isArray(cardData.tagIds) ? { tagIds: cardData.tagIds } : {}),
      reviewLogs: normalizedReviewLogs,
    };

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.addItem('cards', newCard);
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
    const patch: Partial<Card> = { ...data };
    // Legacy rows fields are read-only migration inputs. Never persist them again.
    delete (patch as any).questionExtraRows;
    delete (patch as any).answerExtraRows;
    delete (patch as any).question_extra_rows;
    delete (patch as any).answer_extra_rows;
    if (Array.isArray(patch.reviewLogs)) {
      patch.reviewLogs = [...patch.reviewLogs].sort(
        (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      );
    }

    // 通常の更新処理
    await db.updateItem('cards', id, {
      ...patch,
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
    const targetFolderCards = allCards.filter(
      (c) => c.folderId === targetFolderId && !isCardDeleted(c as Partial<Card> & { is_deleted?: boolean })
    );
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
