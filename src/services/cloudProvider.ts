import {
  collection,
  type CollectionReference,
  doc,
  type DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  setDoc,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore";

import {
  cardDocPathSegments,
  cardsPathSegments,
  folderDocPathSegments,
  foldersPathSegments,
} from "./firestorePaths";

import { requireFirestoreDb } from "@/infrastructure/firebase/client";
import type { Card, Folder } from "@/types";

const denormalizeCardForCloud = (card: Card) => {
  return { ...card };
};

const PAGE_SIZE = 500;

const fetchPagedDocs = async <T extends DocumentData>(
  collectionRef: CollectionReference<T>,
  sinceTimestamp: Timestamp,
): Promise<Array<QueryDocumentSnapshot<T>>> => {
  const documents: Array<QueryDocumentSnapshot<T>> = [];
  let lastDocument: QueryDocumentSnapshot<T> | null = null;

  while (true) {
    const constraints: QueryConstraint[] = [
      where("updatedAt", ">", sinceTimestamp),
      orderBy("updatedAt", "asc"),
      limit(PAGE_SIZE),
    ];

    if (lastDocument) {
      constraints.push(startAfter(lastDocument));
    }

    const snapshot = await getDocs(query(collectionRef, ...constraints));
    documents.push(...snapshot.docs);

    if (snapshot.empty || snapshot.size < PAGE_SIZE) {
      break;
    }

    lastDocument = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!lastDocument) break;
  }

  return documents;
};

const mapSnapshotWithId = <T extends object>(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): T => {
  return {
    id: snapshot.id,
    ...(snapshot.data() as Record<string, unknown>),
  } as T;
};

export interface ICloudProvider {
  upsertFolder(folder: Folder): Promise<void>;
  upsertCard(card: Card): Promise<void>;
  fetchUpdatedDataSince(
    lastSyncTime: Date,
    userId: string,
  ): Promise<{ folders: Folder[]; cards: Card[] }>;
  deleteFolder(folderId: string, userId: string): Promise<void>;
  deleteCard(cardId: string, userId: string): Promise<void>;
}

export class FirebaseCloudProvider implements ICloudProvider {
  public readonly upsertFolder = async (folder: Folder): Promise<void> => {
    const db = requireFirestoreDb();
    if (!folder.userId) {
      throw new Error("userId is required for upsertFolder");
    }

    const documentRef = doc(
      db,
      ...folderDocPathSegments(folder.userId, folder.id),
    );
    await setDoc(
      documentRef,
      {
        ...folder,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  };

  public readonly upsertCard = async (card: Card): Promise<void> => {
    const db = requireFirestoreDb();
    if (!card.userId) {
      throw new Error("userId is required for upsertCard");
    }

    const documentRef = doc(db, ...cardDocPathSegments(card.userId, card.id));
    await setDoc(
      documentRef,
      {
        ...denormalizeCardForCloud(card),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  };

  public readonly fetchUpdatedDataSince = async (
    lastSyncTime: Date,
    userId: string,
  ): Promise<{ folders: Folder[]; cards: Card[] }> => {
    const db = requireFirestoreDb();
    if (!userId) {
      throw new Error("userId is required for fetchUpdatedDataSince");
    }

    const sinceTimestamp = Timestamp.fromDate(lastSyncTime);
    const foldersCollection = collection(
      db,
      ...foldersPathSegments(userId),
    ) as CollectionReference<DocumentData>;
    const cardsCollection = collection(
      db,
      ...cardsPathSegments(userId),
    ) as CollectionReference<DocumentData>;

    const [folderDocs, cardDocs] = await Promise.all([
      fetchPagedDocs(foldersCollection, sinceTimestamp),
      fetchPagedDocs(cardsCollection, sinceTimestamp),
    ]);

    return {
      folders: folderDocs.map((snapshot) =>
        mapSnapshotWithId<Folder>(snapshot),
      ),
      cards: cardDocs.map((snapshot) => mapSnapshotWithId<Card>(snapshot)),
    };
  };

  public readonly deleteFolder = async (
    folderId: string,
    userId: string,
  ): Promise<void> => {
    const db = requireFirestoreDb();
    if (!userId) {
      throw new Error("userId is required for deleteFolder");
    }

    const documentRef = doc(db, ...folderDocPathSegments(userId, folderId));
    await setDoc(
      documentRef,
      {
        isDeleted: true,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  };

  public readonly deleteCard = async (
    cardId: string,
    userId: string,
  ): Promise<void> => {
    const db = requireFirestoreDb();
    if (!userId) {
      throw new Error("userId is required for deleteCard");
    }

    const documentRef = doc(db, ...cardDocPathSegments(userId, cardId));
    await setDoc(
      documentRef,
      {
        isDeleted: true,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  };
}
