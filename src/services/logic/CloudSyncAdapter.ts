import type { ICloudSyncAdapter } from '../interfaces/ISyncService';
import { firestoreDb } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import * as Firestore from 'firebase/firestore';

/**
 * undefined は Firestore に投げた瞬間に爆発するので、深い階層まで除去する。
 * ※ 配列内の undefined も消す（Firestore 的にアウト）
 * ※ Date / Timestamp はそのまま
 */
function deepStripUndefined(input: any): any {
  if (input === undefined) return undefined;
  if (input === null) return null;

  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input
      .map(deepStripUndefined)
      .filter((v) => v !== undefined);
  }

  if (typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      const cleaned = deepStripUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }

  return input;
}

/**
 * serverTimestamp が使える環境なら使う。無理ならクライアント時刻で妥協。
 * （大規模運用なら最終的には serverTimestamp に統一したいが、まず死なないのが最優先）
 */
function cloudUpdatedAt(): any {
  const fn = (Firestore as any).serverTimestamp;
  if (typeof fn === 'function') return fn();
  return Timestamp.now();
}

const COLLECTION_BY_TYPE: Record<string, string> = {
  card: 'cards',
  folder: 'folders',
  cardRelation: 'cardRelations',
  projectMap: 'projectMaps',
  userSetting: 'userSettings',
};

export class CloudSyncAdapter implements ICloudSyncAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private sanitizeForCloud(type: string, data: any): any {
    if (!data) return data;

    // ✅ 全エンティティ共通: undefined を深く除去
    const cleaned = deepStripUndefined(data);

    // ここでローカル専用フィールドを落としたいなら type ごとに増やす
    // （今の 'document' 判定は多分使われてないので、必要になったら追加でOK）
    return cleaned;
  }

  private sanitizeFromCloud(type: string, data: any): any {
    if (!data) return data;
    return deepStripUndefined(data);
  }

  async pullDiff(since: number): Promise<{ changes: any[]; serverTime: number }> {
    console.log('🔄 [CloudSyncAdapter] pullDiff START', { since, userId: this.userId });
    const changes: any[] = [];

    if (!firestoreDb) {
      console.warn('⚠️ [CloudSyncAdapter] firestoreDb is not initialized. Skipping pullDiff.');
      return { changes: [], serverTime: Date.now() };
    }

    try {
      const sinceTimestamp = Timestamp.fromMillis(since);

      // cards
      {
        const ref = collection(firestoreDb, `users/${this.userId}/cards`);
        const qy = query(ref, where('updatedAt', '>', sinceTimestamp));
        const snap = await getDocs(qy);
        console.log(`[CloudSyncAdapter] Remote cards found: ${snap.size}`);
        snap.forEach((d) => {
          changes.push({ type: 'card', id: d.id, data: this.sanitizeFromCloud('card', d.data()) });
        });
      }

      // folders
      {
        const ref = collection(firestoreDb, `users/${this.userId}/folders`);
        const qy = query(ref, where('updatedAt', '>', sinceTimestamp));
        const snap = await getDocs(qy);
        console.log(`[CloudSyncAdapter] Remote folders found: ${snap.size}`);
        snap.forEach((d) => {
          changes.push({ type: 'folder', id: d.id, data: this.sanitizeFromCloud('folder', d.data()) });
        });
      }

      // cardRelations
      {
        const ref = collection(firestoreDb, `users/${this.userId}/cardRelations`);
        const qy = query(ref, where('updatedAt', '>', sinceTimestamp));
        const snap = await getDocs(qy);
        console.log(`[CloudSyncAdapter] Remote relations found: ${snap.size}`);
        snap.forEach((d) => {
          changes.push({
            type: 'cardRelation',
            id: d.id,
            data: this.sanitizeFromCloud('cardRelation', d.data()),
          });
        });
      }

      // projectMaps
      {
        const ref = collection(firestoreDb, `users/${this.userId}/projectMaps`);
        const qy = query(ref, where('updatedAt', '>', sinceTimestamp));
        const snap = await getDocs(qy);
        console.log(`[CloudSyncAdapter] Remote maps found: ${snap.size}`);
        snap.forEach((d) => {
          changes.push({
            type: 'projectMap',
            id: d.id,
            data: this.sanitizeFromCloud('projectMap', d.data()),
          });
        });
      }

      // userSettings (top-level document)
      {
        const settingsRef = doc(firestoreDb, 'userSettings', this.userId);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data: any = this.sanitizeFromCloud('userSetting', snap.data());
          const updatedAt = data?.updatedAt?.toMillis?.()
            ?? data?.updatedAt?.getTime?.()
            ?? (data?.updatedAt instanceof Date ? data.updatedAt.getTime() : 0);
          if (!since || updatedAt > since) {
            changes.push({ type: 'userSetting', id: snap.id, data });
          }
        }
      }

      console.log(`🔄 [CloudSyncAdapter] pullDiff SUCCESS. Total changes: ${changes.length}`);
      return { changes, serverTime: Date.now() };
    } catch (error) {
      console.error('❌ [CloudSyncAdapter] pullDiff ERROR:', error);
      throw error;
    }
  }

  async pushBatch(
    changes: any[]
  ): Promise<{ successIds: string[]; failedIds: string[]; error?: any }> {
    console.log(`📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`);
    const successIds: string[] = [];
    const failedIds: string[] = [];

    try {
      if (!firestoreDb) {
        console.error('❌ [CloudSyncAdapter] firestoreDb is null during pushBatch');
        return {
          successIds: [],
          failedIds: changes.map((c) => c.id),
          error: new Error('Firestore not initialized'),
        };
      }

      const batch = writeBatch(firestoreDb);

      for (const change of changes) {
        const { type, id, data } = change;
        const col = COLLECTION_BY_TYPE[type] ?? `${type}s`; // 保険
        console.log(`   - Adding to batch: ${col}/${id}`);
        const docRef =
          type === 'userSetting'
            ? doc(firestoreDb, 'userSettings', id || this.userId)
            : doc(firestoreDb, `users/${this.userId}/${col}`, id);
        const sanitized = this.sanitizeForCloud(type, data);

        // sanitized が null とか来たら普通に事故るので最低限の防御
        if (!sanitized || typeof sanitized !== 'object') {
          throw new Error(`Invalid payload for ${type}/${id}: expected object`);
        }

        batch.set(
          docRef,
          {
            ...sanitized,
            updatedAt: cloudUpdatedAt(),
          },
          { merge: true }
        );

        successIds.push(id);
      }

      console.log('   - Committing batch...');
      await batch.commit();
      console.log('📤 [CloudSyncAdapter] pushBatch SUCCESS');

      return { successIds, failedIds };
    } catch (error) {
      console.error('❌ [CloudSyncAdapter] pushBatch ERROR:', error);
      return {
        successIds: [],
        failedIds: changes.map((c) => c.id),
        error,
      };
    }
  }

  async pullFull(entityIds: string[]): Promise<any[]> {
    const results: any[] = [];

    for (const id of entityIds) {
      if (!firestoreDb) throw new Error('Firebase Firestore is not initialized.');

      // card
      {
        const snap = await getDocs(
          query(collection(firestoreDb, `users/${this.userId}/cards`), where('id', '==', id))
        );
        if (!snap.empty) {
          results.push({ type: 'card', id, data: this.sanitizeFromCloud('card', snap.docs[0].data()) });
          continue;
        }
      }

      // folder
      {
        const snap = await getDocs(
          query(collection(firestoreDb, `users/${this.userId}/folders`), where('id', '==', id))
        );
        if (!snap.empty) {
          results.push({ type: 'folder', id, data: this.sanitizeFromCloud('folder', snap.docs[0].data()) });
          continue;
        }
      }

      // cardRelation
      {
        const snap = await getDocs(
          query(collection(firestoreDb, `users/${this.userId}/cardRelations`), where('id', '==', id))
        );
        if (!snap.empty) {
          results.push({
            type: 'cardRelation',
            id,
            data: this.sanitizeFromCloud('cardRelation', snap.docs[0].data()),
          });
          continue;
        }
      }

      // projectMap
      {
        const snap = await getDocs(
          query(collection(firestoreDb, `users/${this.userId}/projectMaps`), where('id', '==', id))
        );
        if (!snap.empty) {
          results.push({
            type: 'projectMap',
            id,
            data: this.sanitizeFromCloud('projectMap', snap.docs[0].data()),
          });
        }
      }

      // userSetting
      {
        const snap = await getDoc(doc(firestoreDb, 'userSettings', this.userId));
        if (snap.exists()) {
          results.push({
            type: 'userSetting',
            id: this.userId,
            data: this.sanitizeFromCloud('userSetting', snap.data()),
          });
        }
      }
    }

    return results;
  }
}
