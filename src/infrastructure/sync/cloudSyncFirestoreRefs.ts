import {
  collection,
  type CollectionReference,
  doc,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Query,
  query,
  where,
} from "firebase/firestore";

import {
  type CloudEntityType,
  COLLECTION_BY_TYPE,
  type PullableEntityType,
} from "@/application/usecases/cloudSyncShared";
import { requireFirestoreDb } from "@/infrastructure/firebase/client";

export const requireCloudSyncFirestore = (): Firestore => requireFirestoreDb();

export const getPullableCollectionRef = (
  firestore: Firestore,
  userId: string,
  type: PullableEntityType,
): CollectionReference<DocumentData> =>
  collection(firestore, `users/${userId}/${COLLECTION_BY_TYPE[type]}`);

export const getPushDocumentRef = (
  firestore: Firestore,
  userId: string,
  type: CloudEntityType,
  id: string,
): DocumentReference<DocumentData> =>
  type === "userSetting"
    ? doc(firestore, "userSettings", id || userId)
    : doc(firestore, `users/${userId}/${COLLECTION_BY_TYPE[type]}`, id);

export const queryEntityById = (
  firestore: Firestore,
  userId: string,
  collectionName: string,
  id: string,
): Query<DocumentData> =>
  query(
    collection(firestore, `users/${userId}/${collectionName}`),
    where("id", "==", id),
  );

export const getUserSettingsRef = (
  firestore: Firestore,
  userId: string,
): DocumentReference<DocumentData> => doc(firestore, "userSettings", userId);
