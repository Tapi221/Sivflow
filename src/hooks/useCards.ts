import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { initializeDB, localDb } from '../services/localDB';
import { useAuth } from '../contexts/AuthContext';
import { normalizeCard } from '../utils';
import { normalizeMemoryStability } from '../utils/reviewUtils';
import { useUserSettings, DEFAULT_SETTINGS } from './useUserSettings';
import type { Card } from '../types';

export function useCards(folderId?: string) {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Use settings to determine init schedule
  const { settings } = useUserSettings();

  // DBを初期化
  useEffect(() => {
    if (currentUser) {
      initializeDB(currentUser.uid);
    }
  }, [currentUser]);

  // useLiveQueryでリアクティブにカードを取得
  // localDb.name（DB名）を依存配列に含めることで、ユーザー切り替え時も正しく再取得
  const rawCards = useLiveQuery(
    async () => {
      try {
        console.log(`[Diagnostic] useCards: Fetching from DB ${localDb.name}`);
        const all = await localDb.getAllCards(); 
        console.log(`[Diagnostic] useCards: TOTAL CARDS IN DEXIE (Normalized) = ${all.length}`);
        all.forEach((c, i) => {
            console.log(`[Dexie-Card-${i}] ID=${c.id}, Q=${c.questionText}, Folder=${c.folderId}, Deleted=${c.isDeleted}, User=${c.userId}`);
        });
        return all;
      } catch (err: any) {
        console.error(`[useCards] Error: ${err.message}`);
        setError(err.message);
        return [];
      }
    },

    [currentUser, localDb.name]
  );

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

    console.log('[Diagnostic] createCard START. localDb instance type:', localDb?.constructor?.name);
    console.log('[createCard] START', { folderId: cardData.folderId, questionText: cardData.questionText });

    // Force fetch settings to ensure freshness
    const userSettings = await localDb.userSettings.get(currentUser.uid);
    const effectiveSettings = { ...DEFAULT_SETTINGS, ...(userSettings || {}) };
    const startNextDay = effectiveSettings.reviewStartNextDay ?? true;

    const now = new Date();
    // orderIndex: 同じfolderIdのカードから計算
    const folderCards = cards.filter(c => c.folderId === (cardData.folderId || ''));
    const orderIndex = cardData.orderIndex ?? folderCards.length;
    const questionNumber = `Q${orderIndex + 1}`;
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
      memoryStability: 0,
      currentLevel: cardData.currentLevel ?? null,
      nextReviewDate,
      createdAt: now,
      updatedAt: now,
    };

    try {
      console.log('[createCard] BEFORE_LOCALDB_ADD', { table: 'cards', cardId: newCard.id });
      await localDb.addItem('cards', newCard);
      console.log('[createCard] AFTER_LOCALDB_ADD', { table: 'cards', cardId: newCard.id, status: 'success' });
      return newCard;
    } catch (err) {
      console.error('[createCard] ERROR during LocalDB add', { table: 'cards', cardId: newCard.id, error: err });
      throw err;
    }
  };

  const updateCard = async (id: string, data: Partial<Card>) => {
    if (!currentUser) throw new Error('認証が必要です');

    await localDb.updateItem('cards', id, {
      ...data,
      updatedAt: new Date(),
    });
  };

  const deleteCard = async (id: string) => {
    if (!currentUser) throw new Error('認証が必要です');
    // ソフト削除: ACTIVE → TRASHED
    // isDeleted と deletedAt を同時に設定
    await localDb.softDelete('cards', id);
  };

  const toggleFlag = async (id: string, flag: 'hasUncertainty' | 'isCompleted' | 'isSilent' | 'isBookmarked') => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    
    await updateCard(id, { [flag]: !card[flag] });
  };

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    toggleFlag,
  };
}
