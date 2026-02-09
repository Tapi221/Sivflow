import { firestoreDb } from './firebase';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
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

const denormalizeFolderForCloud = (folder: Folder) => {
  const memoImages = normalizeUploadedImages((folder as any).memoImages ?? (folder as any).memo_images ?? []);
  return {
    ...folder,
    memoImages: denormalizeUploadedImages(memoImages, { case: 'camel', stripUndefined: true }),
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
      ...denormalizeFolderForCloud(folder),
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
    
    // フォルダの取得
    const foldersQuery = query(
      collection(firestoreDb, ...foldersPathSegments(userId)),
      where('updatedAt', '>', Timestamp.fromDate(lastSyncTime))
    );

    const foldersSnapshot = await getDocs(foldersQuery);
    const folders = foldersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as Folder));

    // カードの取得（フォルダに関わらずユーザー単位で取得）
    const cardsQuery = query(
      collection(firestoreDb, ...cardsPathSegments(userId)),
      where('updatedAt', '>', Timestamp.fromDate(lastSyncTime))
    );

    const cardsSnapshot = await getDocs(cardsQuery);
    const cards = cardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any as Card));

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
