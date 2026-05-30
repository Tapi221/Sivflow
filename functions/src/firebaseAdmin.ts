import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { FieldValue, Firestore } from "firebase-admin/firestore";

let adminAppPromise: Promise<App> | null = null;
let authModulePromise: Promise<typeof import("firebase-admin/auth")> | null = null;
let firestoreModulePromise: Promise<typeof import("firebase-admin/firestore")> | null = null;

export const ensureFirebaseAdmin = async (): Promise<App> => {
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

export const getAdminAuth = async (): Promise<Auth> => {
  const app = await ensureFirebaseAdmin();
  const { getAuth } = await getAuthModule();
  return getAuth(app);
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
