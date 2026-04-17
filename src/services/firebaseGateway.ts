import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

import {
  firestoreDb,
  requireFirestoreDb,
  storage,
} from "@/infrastructure/firebase/client";

export const getFirestoreDb = (): Firestore | null => firestoreDb;

export const requireAppFirestoreDb = (): Firestore => requireFirestoreDb();

export const getFirebaseStorage = (): FirebaseStorage => storage;
