import { firestoreDb, requireFirestoreDb, storage } from "@platform/firebase/client";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";



const getFirestoreDb = (): Firestore | null => firestoreDb;
const requireAppFirestoreDb = (): Firestore => requireFirestoreDb();
const getFirebaseStorage = (): FirebaseStorage => storage;



export { getFirestoreDb, requireAppFirestoreDb, getFirebaseStorage };
