import type { ICloudSyncAdapter } from '../interfaces/ISyncService';
import { firestoreDb } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * CloudSyncAdapter: Firestoreとの通信を隠蔽するアダプター
 * I/O処理のみを担当し、ビジネスロジックは持たない
 */
export class CloudSyncAdapter implements ICloudSyncAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private sanitizeForCloud(type: string, data: any): any {
    if (type !== 'document' || !data || typeof data !== 'object') return data;
    const next = { ...data };
    delete next.localFileId;
    delete next.blobUrl;
    if (typeof next.localUrl === 'string' && next.localUrl.startsWith('blob:')) {
      next.localUrl = null;
    }
    return next;
  }

  private sanitizeFromCloud(type: string, data: any): any {
    if (type !== 'document' || !data || typeof data !== 'object') return data;
    const next = { ...data };
    delete next.localFileId;
    delete next.blobUrl;
    if (typeof next.localUrl === 'string' && next.localUrl.startsWith('blob:')) {
      next.localUrl = null;
    }
    return next;
  }

  /**
   * 指定時刻以降の差分を取得
   */
  async pullDiff(since: number): Promise<{ changes: any[], serverTime: number }> {
    console.log('🔄 [CloudSyncAdapter] pullDiff START', { since, userId: this.userId });
    const changes: any[] = [];
    if (!firestoreDb) {
      console.warn('⚠️ [CloudSyncAdapter] firestoreDb is not initialized. Skipping pullDiff.');
      return { changes: [], serverTime: Date.now() };
    }

    try {
      // 比較用の Timestamp オブジェクトを作成
      const sinceTimestamp = Timestamp.fromMillis(since);

      // カードの変更を取得
      const cardsRef = collection(firestoreDb, `users/${this.userId}/cards`);
      const cardsQuery = query(cardsRef, where('updatedAt', '>', sinceTimestamp));
      const cardsSnapshot = await getDocs(cardsQuery);
      console.log(`[CloudSyncAdapter] Remote cards found: ${cardsSnapshot.size}`);
      
      cardsSnapshot.forEach(doc => {
        changes.push({
          type: 'card',
          id: doc.id,
          data: this.sanitizeFromCloud('card', doc.data())
        });
      });

      // フォルダの変更を取得
      const foldersRef = collection(firestoreDb, `users/${this.userId}/folders`);
      const foldersQuery = query(foldersRef, where('updatedAt', '>', sinceTimestamp));
      const foldersSnapshot = await getDocs(foldersQuery);
      console.log(`[CloudSyncAdapter] Remote folders found: ${foldersSnapshot.size}`);
      
      foldersSnapshot.forEach(doc => {
        changes.push({
          type: 'folder',
          id: doc.id,
          data: this.sanitizeFromCloud('folder', doc.data())
        });
      });
      
      // Card Relationsの変更を取得
      const relationsRef = collection(firestoreDb, `users/${this.userId}/cardRelations`);
      const relationsQuery = query(relationsRef, where('updatedAt', '>', sinceTimestamp));
      const relationsSnapshot = await getDocs(relationsQuery);
      console.log(`[CloudSyncAdapter] Remote relations found: ${relationsSnapshot.size}`);
      
      relationsSnapshot.forEach(doc => {
        changes.push({
          type: 'cardRelation',
          id: doc.id,
          data: this.sanitizeFromCloud('cardRelation', doc.data())
        });
      });

      // Project Mapsの変更を取得
      const mapsRef = collection(firestoreDb, `users/${this.userId}/projectMaps`);
      const mapsQuery = query(mapsRef, where('updatedAt', '>', sinceTimestamp));
      const mapsSnapshot = await getDocs(mapsQuery);
      console.log(`[CloudSyncAdapter] Remote maps found: ${mapsSnapshot.size}`);
      
      mapsSnapshot.forEach(doc => {
        changes.push({
          type: 'projectMap',
          id: doc.id,
          data: this.sanitizeFromCloud('projectMap', doc.data())
        });
      });

      console.log(`🔄 [CloudSyncAdapter] pullDiff SUCCESS. Total changes: ${changes.length}`);
      return {
        changes,
        serverTime: Date.now()
      };
    } catch (error) {
      console.error('❌ [CloudSyncAdapter] pullDiff ERROR:', error);
      throw error;
    }
  }

  /**
   * バッチでデータを送信
   */
  async pushBatch(changes: any[]): Promise<{ successIds: string[], failedIds: string[], error?: any }> {
    console.log(`📤 [CloudSyncAdapter] pushBatch START. Count: ${changes.length}`);
    const successIds: string[] = [];
    const failedIds: string[] = [];
    
    try {
      if (!firestoreDb) {
        console.error('❌ [CloudSyncAdapter] firestoreDb is null during pushBatch');
        return { successIds: [], failedIds: changes.map(c => c.id), error: new Error('Firestore not initialized') };
      }
      const batch = writeBatch(firestoreDb);
      
      for (const change of changes) {
        const { type, id, data } = change;
        console.log(`   - Adding to batch: ${type}/${id}`);
        const docRef = doc(firestoreDb, `users/${this.userId}/${type}s`, id);
        const sanitized = this.sanitizeForCloud(type, data);
        
        batch.set(docRef, {
          ...sanitized,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        successIds.push(id);
      }
      
      console.log('   - Committing batch...');
      await batch.commit();
      console.log('📤 [CloudSyncAdapter] pushBatch SUCCESS');
      
      return { successIds, failedIds };
    } catch (error) {
      console.error('❌ [CloudSyncAdapter] pushBatch ERROR:', error);
      // バッチ全体が失敗した場合、全てfailedに
      return {
        successIds: [],
        failedIds: changes.map(c => c.id),
        error
      };
    }
  }

  /**
   * フォールバック用のフル同期（指定IDのデータを全取得）
   */
  async pullFull(entityIds: string[]): Promise<any[]> {
    const results: any[] = [];
    
    // カードとフォルダを個別に取得
    for (const id of entityIds) {
      if (!firestoreDb) throw new Error('Firebase Firestore is not initialized.');
      // カードを試す
      const cardDoc = await getDocs(query(
        collection(firestoreDb, `users/${this.userId}/cards`),
        where('id', '==', id)
      ));
      
      if (!cardDoc.empty) {
        results.push({
          type: 'card',
          id,
          data: cardDoc.docs[0].data()
        });
        continue;
      }
      
      // フォルダを試す
      const folderDoc = await getDocs(query(
        collection(firestoreDb, `users/${this.userId}/folders`),
        where('id', '==', id)
      ));
      
      if (!folderDoc.empty) {
        results.push({
          type: 'folder',
          id,
          data: folderDoc.docs[0].data()
        });
      }

      // Card Relationsを試す
      const relationDoc = await getDocs(query(
        collection(firestoreDb, `users/${this.userId}/cardRelations`),
        where('id', '==', id)
      ));
      
      if (!relationDoc.empty) {
        results.push({
          type: 'cardRelation',
          id,
          data: relationDoc.docs[0].data()
        });
        continue;
      }

      // Project Mapsを試す
      const mapDoc = await getDocs(query(
        collection(firestoreDb, `users/${this.userId}/projectMaps`),
        where('id', '==', id)
      ));
      
      if (!mapDoc.empty) {
        results.push({
          type: 'projectMap',
          id,
          data: mapDoc.docs[0].data()
        });
      }
    }
    
    return results;
  }
}
