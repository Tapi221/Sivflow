import type { App } from "firebase-admin/app";
import type { FieldValue, Firestore } from "firebase-admin/firestore";

let adminAppPromise: Promise<App> | null = null;
let firestoreModulePromise: Promise<typeof import("firebase-admin/firestore")> | null = null;

export const ensureFirebaseAdmin = async (): Promise<App> => {
  adminAppPromise ??= (async () => {
    const { getApp, getApps, initializeApp } = await import("firebase-admin/app");

    if (getApps().length === 0) {
      return initializeApp();
    }

    return getApp();
  })();

  return await adminAppPromise;
};

const getFirestoreModule = async () => {
  firestoreModulePromise ??= import("firebase-admin/firestore");
  return await firestoreModulePromise;
};

export const getDb = async (): Promise<Firestore> => {
  const app = await ensureFirebaseAdmin();
  const { getFirestore } = await getFirestoreModule();
  return getFirestore(app);
};

export const serverTimestamp = async (): Promise<FieldValue> => {
  const { FieldValue } = await getFirestoreModule();
  return FieldValue.serverTimestamp();
};
