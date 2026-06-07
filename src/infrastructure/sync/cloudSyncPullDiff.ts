import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { getDoc, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { getPullableCollectionRef, getUserSettingsRef, requireCloudSyncFirestore } from "./cloudSyncFirestoreRefs";
import { COLLECTION_BY_TYPE, getUpdatedAtMillis, PULLABLE_ENTITY_TYPES, type PullableEntityType, sanitizeSyncDataFromCloud