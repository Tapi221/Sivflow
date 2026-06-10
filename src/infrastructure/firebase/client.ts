import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { collection, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type FirebaseClientState = {
  app: FirebaseApp | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  functionsClient: Functions | null;
  firestoreDb: Firestore | null;
};

const REQUIRED_FIREBASE_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const getFirebaseEnvValue = (key: (typeof REQUIRED_FIREBASE_ENV_KEYS)[number]) => {
  return import.meta.env[key];
};

const getMissingFirebaseEnvVars = (): string[] => {
  return REQUIRED_FIREBASE_ENV_KEYS.filter((key) => {
    const value = getFirebaseEnvValue(key);
    return typeof value !== "string" || value.trim().length === 0;
  });
};

const createUnavailableState = (): FirebaseClientState => ({
  app: null,
  auth: null,
  storage: null,
  functionsClient: null,
  firestoreDb: null,
});

export const missingFirebaseEnvVars = getMissingFirebaseEnvVars();
export const isFirebaseClientAvailable = missingFirebaseEnvVars.length === 0;

const initializeFirebaseClient = (): FirebaseClientState => {
  if (!isFirebaseClientAvailable) {
    if (import.meta.env.DEV || import.meta.env.MODE === "test") {
      console.warn(
        `[Firebase] Firebase env is incomplete; starting in local-first mode without cloud services. Missing: ${missingFirebaseEnvVars.join(", ")}`,
      );
    }
    return createUnavailableState();
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const functionsClient = getFunctions(app, "asia-northeast1");
  let firestoreDb: Firestore | null = null;

  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    console.log("[Firebase] Firestore initialized with persistent cache");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(
      "[Firebase] initializeFirestore failed, falling back to getFirestore:",
      message,
    );

    try {
      firestoreDb = getFirestore(app);
      console.log("[Firebase] Fallback to getFirestore() successful");
    } catch (fallbackError: unknown) {
      console.error(
        "[Firebase] All Firestore initialization attempts failed:",
        fallbackError,
      );
    }
  }

  return {
    app,
    auth,
    storage,
    functionsClient,
    firestoreDb,
  };
};

const firebaseClientState = initializeFirebaseClient();

export const firebaseApp = firebaseClientState.app;
export const auth = firebaseClientState.auth as Auth;
export const storage = firebaseClientState.storage as FirebaseStorage;
export const functionsClient = firebaseClientState.functionsClient as Functions;
export const firestoreDb: Firestore | null = firebaseClientState.firestoreDb;
export const db: Firestore | null = firebaseClientState.firestoreDb;

export const requireFirebaseClient = (): FirebaseClientState => {
  if (isFirebaseClientAvailable && firebaseClientState.app) {
    return firebaseClientState;
  }

  throw new Error(
    `[Firebase] Firebase client is unavailable. Missing env vars: ${missingFirebaseEnvVars.join(", ")}`,
  );
};

export const requireFirestoreDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (!isFirebaseClientAvailable) {
    throw new Error(
      `[Firebase] Firestore is unavailable because Firebase env is incomplete: ${missingFirebaseEnvVars.join(", ")}`,
    );
  }

  throw new Error(
    "[Firebase] Firestore initialization failed. Firestore-dependent flow cannot continue.",
  );
};

const debugFirebase = (): void => {
  console.log("=== Firebase Debug Info ===");

  if (!firebaseClientState.app) {
    console.log("App instance: unavailable");
    console.log("Mode: local-first without cloud services");
    console.log("Missing env vars:", missingFirebaseEnvVars.join(", "));
    console.log("==========================");
    return;
  }

  try {
    console.log("App name:", firebaseClientState.app.name);
    console.log("DB instance:", firestoreDb ? "exists" : "MISSING");
    console.log("Functions instance:", functionsClient ? "exists" : "MISSING");

    if (firestoreDb) {
      const testRef = collection(firestoreDb, "test_connection");
      console.log("collection() basic check passed:", testRef.path);
    }
  } catch (error) {
    console.error("debugFirebase error:", error);
  }

  console.log("==========================");
};

if (import.meta.env.DEV) {
  debugFirebase();
}
