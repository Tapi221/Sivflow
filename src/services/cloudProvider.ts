import { firestoreDb } from './firebase';
import { collection, doc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import * as Firestore from 'firebase/firestore';
import type { Folder, Card } from '../types';
import { denormalizeUploadedImages, normalizeUploadedImages } from '../utils/imageUtils';
import { foldersPathSegments, folderDocPathSegments, cardsPathSegments, cardDocPathSegments } from './firestorePaths';

const denormalizeCardForCloud = (card: Card) => {
  const questionImages = normalizeUploadedImages((card as any).questionImages ?? (card as any).question_images ?? []);
  const answerImages = normalizeUploadedImages((card as any).answerImages ?? (card as any).answer_images ?? []);
  return {
    ...card,
    questionImages: denormalizeUploadedImages(questionImages, { case: 'camel', stripUndefined: true }),
    answerImages: denormalizeUploadedImages(answerImages, { case: 'camel', stripUndefined: true }),
  };
};

/**
 * クラウドストレージの抽象化インターフェース
 * Firebase, CloudKit, Google Driveなどに対応可能
 */
export interface ICloudProvider {
  upsertFolder(folder: Folder): Promise<void>;
  upsertCard(card: Card): Promise<void>;
  fetchUpdatedDataSince(
    lastSyncTime: Date,
    userId: string
  ): Promise<{ folders: Folder[]; cards: Card[] }>;
  deleteFolder(folderId: string, userId: string): Promise<void>;
  deleteCard(cardId: string, userId: string): Promise<void>;
}

/**
 * Firebase Firestore実装
 */
export class FirebaseCloudProvider implements ICloudProvider {
  async upsertFolder(folder: Folder): Promise<void> {
    if (!folder.userId) throw new Error('userId is required for upsertFolder');
    const docRef = doc(firestoreDb, ...folderDocPathSegments(folder.userId, folder.id));
    const data = {
      ...folder,
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, data, { merge: true });
  }

  async upsertCard(card: Card): Promise<void> {
    if (!card.userId) throw new Error('userId is required for upsertCard');
    const docRef = doc(firestoreDb, ...cardDocPathSegments(card.userId, card.id));
    const data = {
      ...denormalizeCardForCloud(card),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, data, { merge: true });
  }

  async fetchUpdatedDataSince(
    lastSyncTime: Date,
    userId: string
  ): Promise<{ folders: Folder[]; cards: Card[] }> {
    if (!userId) throw new Error('userId is required for fetchUpdatedDataSince');

    const sinceTimestamp = Timestamp.fromDate(lastSyncTime);

    // 型定義が欠けていても死なないように namespace 経由で参照（存在すればページング）
    const orderByFn = (Firestore as any).orderBy as undefined | ((field: string, dir?: 'asc' | 'desc') => any);
    const limitFn = (Firestore as any).limit as undefined | ((n: number) => any);
    const startAfterFn = (Firestore as any).startAfter as undefined | ((snapshot: any) => any);

    const PAGE_SIZE = 500;
    const canOrder = typeof orderByFn === 'function';
    const canLimit = typeof limitFn === 'function';
    const canPage = canOrder && canLimit && typeof startAfterFn === 'function';

    const fetchPagedDocs = async (colRef: any): Promise<any[]> => {
      const out: any[] = [];
      let lastDoc: any = null;

      while (true) {
        const constraints: any[] = [where('updatedAt', '>', sinceTimestamp)];
        if (canOrder) constraints.push(orderByFn('updatedAt', 'asc'));
        if (canPage && lastDoc) constraints.push(startAfterFn(lastDoc));
        if (canLimit) constraints.push(limitFn(PAGE_SIZE));

        const qy = query(colRef, ...(constraints as any));
        const snap = await getDocs(qy);
        out.push(...snap.docs);

        if (!canPage) break;
        if (snap.empty || snap.size < PAGE_SIZE) break;
        lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        if (!lastDoc) break;
      }

      return out;
    };

    // フォルダの取得
    const foldersCol = collection(firestoreDb, ...foldersPathSegments(userId));
    const folderDocs = await fetchPagedDocs(foldersCol);
    const folders = folderDocs.map((d: any) => ({ id: d.id, ...(d.data()) } as any as Folder));

    // カードの取得（フォルダに関わらずユーザー単位で取得）
    const cardsCol = collection(firestoreDb, ...cardsPathSegments(userId));
    const cardDocs = await fetchPagedDocs(cardsCol);
    const cards = cardDocs.map((d: any) => ({ id: d.id, ...(d.data()) } as any as Card));

    return { folders, cards };
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    if (!userId) throw new Error('userId is required for deleteFolder');
    const docRef = doc(firestoreDb, ...folderDocPathSegments(userId, folderId));
    await setDoc(docRef, { isDeleted: true, updatedAt: Timestamp.now() }, { merge: true });
  }

  async deleteCard(cardId: string, userId: string): Promise<void> {
    if (!userId) throw new Error('userId is required for deleteCard');
    const docRef = doc(firestoreDb, ...cardDocPathSegments(userId, cardId));
    await setDoc(docRef, { isDeleted: true, updatedAt: Timestamp.now() }, { merge: true });
  }
}