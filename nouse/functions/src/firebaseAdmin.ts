import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { FieldValue, Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";

let adminAppPromise: Promise<App> | null = null;
let authModulePromise: Promise<typeof import("firebase-admin/auth")> | null = null;
let firestoreModulePromise: Promise<typeof import("firebase-admin/firestore")> | null = null;
let storageModulePromise: Promise<typeof import("firebase-admin/storage")> | null = null;

const ensureFirebaseAdmin = async (): Promise<App> => {
  adminAppPromise ??= (async () => {
  const { getApp, initializeApp } = await import("firebase-admin/app");

    try {
      return getApp();
    } catch {
      return initializeApp();
    }
  })();

  return await adminAppPromise;
};
const getAuthModule = async () => {
  authModulePromise ??= import("firebase-admin/auth");
  return await authModulePromise;
};
const getFirestoreModule = async () => {
  firestoreModulePromise ??= import("firebase-admin/firestore");
  return await firestoreModulePromise;
};
const getStorageModule = async () => {
  storageModulePromise ??= import("firebase-admin/storage");
  return await storageModulePromise;
};
const getAdminAuth = async (): Promise<Auth> => {
  const app = await ensureFirebaseAdmin();
  const { getAuth } = await getAuthModule();
  return getAuth(app);
};
const getDb = async (): Promise<Firestore> => {
  const app = await ensureFirebaseAdmin();
  const { getFirestore } = await getFirestoreModule();
  return getFirestore(app);
};
const getAdminStorage = async (): Promise<Storage> => {
  const app = await ensureFirebaseAdmin();
  const { getStorage } = await getStorageModule();
  return getStorage(app);
};
const serverTimestamp = async (): Promise<FieldValue> => {
  const { FieldValue } = await getFirestoreModule();
  return FieldValue.serverTimestamp();
};

export { ensureFirebaseAdmin, getAdminAuth, getDb, getAdminStorage, serverTimestamp };
