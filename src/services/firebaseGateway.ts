import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { firestoreDb, requireFirestoreDb, storage } from "@/infrastructure/firebase/client";

const getFirestoreDb = (): Firestore | null => firestoreDb;
const requireAppFirestoreDb = (): Firestore => requireFirestoreDb();
const getFirebaseStorage = (): FirebaseStorage => storage;

export { getFirestoreDb, requireAppFirestoreDb, getFirebaseStorage };
