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

// Firebase アプリの初期化
const app = initializeApp(firebaseConfig);

// 各サービスのエクスポート（シングルトンとして管理）
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast1");

// Firestore の初期化
let _firestoreDb: Firestore | null = null;

try {
  _firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  console.log("[Firebase] Firestore initialized with persistent cache");
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.warn(
    "[Firebase] initializeFirestore failed, falling back to getFirestore:",
    message,
  );

  try {
    _firestoreDb = getFirestore(app);
    console.log("[Firebase] Fallback to getFirestore() successful");
  } catch (fallbackErr: unknown) {
    console.error(
      "[Firebase] All Firestore initialization attempts failed:",
      fallbackErr,
    );
  }
}

/**
 * firestoreDb を取得する。
 */
export const firestoreDb: Firestore | null = _firestoreDb;

// 開発環境では Storage エミュレータを利用して課金を回避
if (typeof window !== "undefined") {
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (useEmulators && isLocalhost) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099");
      if (firestoreDb) {
        connectFirestoreEmulator(firestoreDb, "localhost", 8080);
      }
      connectStorageEmulator(storage, "localhost", 9199);
      connectFunctionsEmulator(functions, "localhost", 5001);
      console.log(
        "Firebase Emulators: Connected (Auth:9099, Firestore:8080, Storage:9199, Functions:5001)",
      );
    } catch (e) {
      console.error("Firebase Emulators connection error:", e);
    }
  } else if (isLocalhost) {
    console.log("Firebase: Connecting to Production (Emulators disabled)");
  }
}

/**
 * Firebase の初期化状態を診断するための関数
 */
export function debugFirebase(): void {
  console.log("🔍 === Firebase Debug Info ===");
  try {
    console.log("App name:", app.name);
    console.log("DB instance:", firestoreDb ? "exists" : "MISSING");
    if (firestoreDb) {
      const testRef = collection(firestoreDb, "test_connection");
      console.log("✅ collection() basic check passed:", testRef.path);
    }
  } catch (error) {
    console.error("❌ debugFirebase error:", error);
  }
  console.log("🔍 ==========================");
}

// 開発環境では自動実行
if (import.meta.env.DEV) {
  debugFirebase();
}

export default app;
