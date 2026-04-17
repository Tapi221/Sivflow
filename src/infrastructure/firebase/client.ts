import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import {
  collection,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
const functions = getFunctions(app, "asia-northeast1");

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

export const requireFirestoreDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  throw new Error(
    "[Firebase] Firestore initialization failed. Firestore-dependent flow cannot continue.",
  );
};

if (typeof window !== "undefined") {
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (useEmulators && isLocalhost) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099");

      if (firestoreDbInternal) {
        connectFirestoreEmulator(firestoreDbInternal, "localhost", 8080);
      }

      connectStorageEmulator(storage, "localhost", 9199);
      connectFunctionsEmulator(functions, "localhost", 5001);

      console.log(
        "Firebase Emulators: Connected (Auth:9099, Firestore:8080, Storage:9199, Functions:5001)",
      );
    } catch (error) {
      console.error("Firebase Emulators connection error:", error);
    }
  } else if (isLocalhost) {
    console.log("Firebase: Connecting to Production (Emulators disabled)");
  }
}

const debugFirebase = (): void => {
  console.log("=== Firebase Debug Info ===");

  try {
    console.log("App name:", app.name);
    console.log("DB instance:", firestoreDbInternal ? "exists" : "MISSING");

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
