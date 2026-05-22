import type { FieldValue, Firestore } from "firebase-admin/firestore";

let adminAppReady: Promise<void> | null = null;
let firestoreModulePromise: Promise<typeof import("firebase-admin/firestore")> | null = null;

export const ensureFirebaseAdmin = async (): Promise<void> => {
  adminAppReady ??= (async () => {
    const { getApps, initializeApp } = await import("firebase-admin/app");

    if (getApps().length === 0) {
      initializeApp();
    }
  })();

  await adminAppReady;
};

const getFirestoreModule = async () => {
  firestoreModulePromise ??= import("firebase-admin/firestore");
  return await firestoreModulePromise;
};

export const getDb = async (): Promise<Firestore> => {
  await ensureFirebaseAdmin();
  const { getFirestore } = await getFirestoreModule();
  return getFirestore();
};

export const serverTimestamp = async (): Promise<FieldValue> => {
  const { FieldValue } = await getFirestoreModule();
  return FieldValue.serverTimestamp();
};
