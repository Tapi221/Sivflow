import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getLocalDb } from '../services/localDB';
import { QueueManager } from '../services/logic/QueueManager';
import { useAuth } from '../contexts/AuthContext';
import type { CardRelation } from '../types';

/**
 * カード間の関連情報を取得・作成・更新・削除するカスタムフック
 * @param relatedCardId 任意のカードID。指定するとこのカードに関係する関連のみ返す
 * @returns カード関連情報と操作関数のオブジェクト
 */
export function useCardRelations(relatedCardId?: string) {
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  /**
   * ローカルDBからカード関連をリアルタイム取得
   * useLiveQueryでcurrentUserの変更に応じて再取得される
   */
  const rawRelations = useLiveQuery(
    async () => {
      try {
        if (!currentUser) return [];
        const db = await getLocalDb();
        return await db.cardRelations
          .where('userId')
          .equals(currentUser.uid)
          .toArray();
      } catch (err: any) {
        console.error(`[useCardRelations] Error: ${err.message}`);
        setError(err.message);
        return [];
      }
    },
    [currentUser]
  );

  /**
   * 取得した関連を必要に応じてフィルタリング
   */
  const relations = useMemo(() => {
    if (!rawRelations) return [];
    if (relatedCardId) {
      return rawRelations.filter(
        r => r.fromCardId === relatedCardId || r.toCardId === relatedCardId
      );
    }
    return rawRelations;
  }, [rawRelations, relatedCardId]);

  /** データ取得中かどうかのフラグ */
  const loading = rawRelations === undefined;

  /**
   * 新しいカード関連を作成
   * @param relationData 作成する関連の部分情報
   * @returns 作成されたCardRelationオブジェクト
   * @throws 未ログインの場合はエラー
   */
  const createRelation = async (relationData: Partial<CardRelation>) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const now = new Date();
    const id = crypto.randomUUID();

    const newRelation: CardRelation = {
      id,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      deviceId: 'web',
      isDeleted: false,
      fromCardId: relationData.fromCardId!,
      toCardId: relationData.toCardId!,
      type: relationData.type || 'related',
      lineType: relationData.lineType || 'straight',
      reasonTag: relationData.reasonTag,
      ...relationData
    } as CardRelation;

    await db.cardRelations.put(newRelation);

    await queueManager.enqueue({
      id: crypto.randomUUID(),
      type: 'upload',
      entity: 'cardRelation',
      payload: newRelation,
      priority: 'high',
      createdAt: Date.now()
    });

    return newRelation;
  };

  /**
   * 既存のカード関連を更新
   * @param id 更新対象のCardRelationのID
   * @param updates 更新内容
   * @returns void
   * @throws 未ログインの場合はエラー
   */
  const updateRelation = async (id: string, updates: Partial<CardRelation>) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const updatedData = { ...updates, updatedAt: new Date() };

    await db.cardRelations.update(id, updatedData);

    const current = await db.cardRelations.get(id);
    if (current) {
      const payload = { ...current, ...updatedData };
      await queueManager.enqueue({
        id: crypto.randomUUID(),
        type: 'upload',
        entity: 'cardRelation',
        payload,
        priority: 'medium',
        createdAt: Date.now()
      });
    }
  };

  /**
   * カード関連を削除（ソフトデリート）
   * @param id 削除対象のCardRelationのID
   * @returns void
   * @throws 未ログインの場合はエラー
   */
  const deleteRelation = async (id: string) => {
    if (!currentUser) throw new Error('Authentication required');

    const db = await getLocalDb();
    const queueManager = new QueueManager(db);

    const now = new Date();
    await db.cardRelations.update(id, { isDeleted: true, updatedAt: now });

    await queueManager.enqueue({
      id: crypto.randomUUID(),
      type: 'upload',
      entity: 'cardRelation',
      payload: { id, isDeleted: true, updatedAt: now },
      priority: 'high',
      createdAt: Date.now()
    });
  };

  return {
    relations,      // フィルタ済みカード関連リスト
    loading,        // データ取得中かどうか
    error,          // エラー情報
    createRelation, // 作成関数
    updateRelation, // 更新関数
    deleteRelation  // 削除関数
  };
}
