import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { collection, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requireFirebaseConfig = (): void => {
  const missing: string[] = [];

  if (!firebaseConfig.apiKey?.trim()) missing.push("VITE_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain?.trim())
    missing.push("VITE_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId?.trim())
    missing.push("VITE_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.storageBucket?.trim())
    missing.push("VITE_FIREBASE_STORAGE_BUCKET");
  if (!firebaseConfig.messagingSenderId?.trim())
    missing.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
  if (!firebaseConfig.appId?.trim()) missing.push("VITE_FIREBASE_APP_ID");

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required Firebase env vars: ${missing.join(
        ", ",
      )}. Copy .env.example to .env.local (or .env) and set values.`,
    );
  }
};

if (import.meta.env.MODE !== "test") {
  requireFirebaseConfig();
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functionsClient = getFunctions(app, "asia-northeast1");

let firestoreDbInternal: Firestore | null = null;

try {
  firestoreDbInternal = initializeFirestore(app, {
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
    firestoreDbInternal = getFirestore(app);
    console.log("[Firebase] Fallback to getFirestore() successful");
  } catch (fallbackError: unknown) {
    console.error(
      "[Firebase] All Firestore initialization attempts failed:",
      fallbackError,
    );
  }
}

export const firestoreDb: Firestore | null = firestoreDbInternal;
export const db: Firestore | null = firestoreDbInternal;

export const requireFirestoreDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  throw new Error(
    "[Firebase] Firestore initialization failed. Firestore-dependent flow cannot continue.",
  );
};

const debugFirebase = (): void => {
  console.log("=== Firebase Debug Info ===");

  try {
    console.log("App name:", app.name);
    console.log("DB instance:", firestoreDbInternal ? "exists" : "MISSING");
    console.log("Functions instance:", functionsClient ? "exists" : "MISSING");

    if (firestoreDbInternal) {
      const testRef = collection(firestoreDbInternal, "test_connection");
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
