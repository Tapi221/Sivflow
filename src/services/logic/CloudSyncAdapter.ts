import type { ICloudSyncAdapter } from '../interfaces/ISyncService';
import { firestoreDb } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

/**
 * CloudSyncAdapter: Firestoreとの通信を隠蔽するアダプター
 * I/O処理のみを担当し、ビジネスロジックは持たない
 */
export class CloudSyncAdapter implements ICloudSyncAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 指定時刻以降の差分を取得
   */
  async pullDiff(since: number): Promise<{ changes: any[], serverTime: number }> {
    const changes: any[] = [];
    if (!firestoreDb) throw new Error('Firebase Firestore is not initialized.');
    
    // カードの変更を取得
    const cardsRef = collection(firestoreDb, `users/${this.userId}/cards`);
    const cardsQuery = query(cardsRef, where('updatedAt', '>', since));
    const cardsSnapshot = await getDocs(cardsQuery);
    
    cardsSnapshot.forEach(doc => {
      changes.push({
        type: 'card',
        id: doc.id,
        data: doc.data()
      });
    });

    // フォルダの変更を取得
    const foldersRef = collection(firestoreDb, `users/${this.userId}/folders`);
    const foldersQuery = query(foldersRef, where('updatedAt', '>', since));
    const foldersSnapshot = await getDocs(foldersQuery);
    
    foldersSnapshot.forEach(doc => {
      changes.push({
        type: 'folder',
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Card Relationsの変更を取得
    const relationsRef = collection(firestoreDb, `users/${this.userId}/cardRelations`);
    const relationsQuery = query(relationsRef, where('updatedAt', '>', since));
    const relationsSnapshot = await getDocs(relationsQuery);
    
    relationsSnapshot.forEach(doc => {
      changes.push({
        type: 'cardRelation',
        id: doc.id,
        data: doc.data()
      });
    });

    // Project Mapsの変更を取得
    const mapsRef = collection(firestoreDb, `users/${this.userId}/projectMaps`);
    const mapsQuery = query(mapsRef, where('updatedAt', '>', since));
    const mapsSnapshot = await getDocs(mapsQuery);
    
    mapsSnapshot.forEach(doc => {
      changes.push({
        type: 'projectMap',
        id: doc.id,
        data: doc.data()
      });
    });

    return {
      changes,
      serverTime: Date.now() // 実際はserverTimestampを使うべきだが、簡易実装
    };
  }

  /**
   * バッチでデータを送信
   */
  async pushBatch(changes: any[]): Promise<{ successIds: string[], failedIds: string[], error?: any }> {
    const successIds: string[] = [];
    const failedIds: string[] = [];
    
    try {
      if (!firestoreDb) throw new Error('Firebase Firestore is not initialized.');
      const batch = writeBatch(firestoreDb);
      
      for (const change of changes) {
        const { type, id, data } = change;
        const docRef = doc(firestoreDb, `users/${this.userId}/${type}s`, id);
        
        batch.set(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        successIds.push(id);
      }
      
      await batch.commit();
      
      return { successIds, failedIds };
    } catch (error) {
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
