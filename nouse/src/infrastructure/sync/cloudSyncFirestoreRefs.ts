import { requireFirestoreDb } from "@platform/firebase/client";
import type { CollectionReference, DocumentData, DocumentReference, Firestore, Query } from "firebase/firestore";
import { collection, doc, query, where } from "firebase/firestore";
import type { CloudEntityType, PullableEntityType } from "@/application/usecases/cloudSyncShared";
import { COLLECTION_BY_TYPE } from "@/application/usecases/cloudSyncShared";



const requireCloudSyncFirestore = (): Firestore => requireFirestoreDb();
const getPullableCollectionRef = (firestore: Firestore, userId: string, type: PullableEntityType): CollectionReference<DocumentData> => collection(firestore, `users/${userId}/${COLLECTION_BY_TYPE[type]}`);
const getPushDocumentRef = (firestore: Firestore, userId: string, type: CloudEntityType, id: string): DocumentReference<DocumentData> => type === "userSetting" ? doc(firestore, "userSettings", id || userId) : doc(firestore, `users/${userId}/${COLLECTION_BY_TYPE[type]}`, id);
const queryEntityById = (firestore: Firestore, userId: string, collectionName: string, id: string): Query<DocumentData> => query(collection(firestore, `users/${userId}/${collectionName}`), where("id", "==", id));
const getUserSettingsRef = (firestore: Firestore, userId: string): DocumentReference<DocumentData> => doc(firestore, "userSettings", userId);



export { requireCloudSyncFirestore, getPullableCollectionRef, getPushDocumentRef, queryEntityById, getUserSettingsRef };
