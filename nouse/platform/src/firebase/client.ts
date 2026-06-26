import type { FirebaseApp } from "firebase/app";

import { initializeApp } from "firebase/app";

import type { Auth } from "firebase/auth";

import { getAuth } from "firebase/auth";

import type { Firestore } from "firebase/firestore";

import { collection, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

import type { Functions } from "firebase/functions";

import { getFunctions } from "firebase/functions";

import type { FirebaseStorage } from "firebase/storage";

import { getStorage } from "firebase/storage";



type FirebaseClientState = {
  app: FirebaseApp | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  functionsClient: Functions | null;
  firestoreDb: Firestore | null;
};

type FirebaseEnvStatus = {
  isAvailable: boolean;
  missingEnvVars: string[];
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

const createFirebaseEnvStatus = (): FirebaseEnvStatus => {
  const missingEnvVars = getMissingFirebaseEnvVars();
  return {
    isAvailable: missingEnvVars.length === 0,
    missingEnvVars,
  };
};

const createUnavailableState = (): FirebaseClientState => ({
  app: null,
  auth: null,
  storage: null,
  functionsClient: null,
  firestoreDb: null,
});

const initializeFirebaseClient = (firebaseEnvStatus: FirebaseEnvStatus): FirebaseClientState => {
  if (!firebaseEnvStatus.isAvailable) {
    if (import.meta.env.DEV || import.meta.env.MODE === "test") {
      console.warn(
        `[Firebase] Firebase 環境変数が不足しているため、クラウド機能なしのローカル優先モードで起動します。不足: ${firebaseEnvStatus.missingEnvVars.join(", ")}`,
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
    console.log("[Firebase] Firestore を永続キャッシュ付きで初期化しました");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      "[Firebase] initializeFirestore に失敗しました。getFirestore にフォールバックします:",
      message,
    );
    try {
      firestoreDb = getFirestore(app);
      console.log("[Firebase] getFirestore() へのフォールバックに成功しました");
    } catch (fallbackError: unknown) {
      console.error(
        "[Firebase] Firestore の初期化にすべて失敗しました:",
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

const requireFirebaseClient = (): FirebaseClientState => {
  if (isFirebaseClientAvailable && firebaseClientState.app) {
    return firebaseClientState;
  }
  throw new Error(
    `[Firebase] Firebase クライアントを利用できません。不足している環境変数: ${missingFirebaseEnvVars.join(", ")}`,
  );
};

const requireFirestoreDb = (): Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }
  if (!isFirebaseClientAvailable) {
    throw new Error(
      `[Firebase] Firebase 環境変数が不足しているため Firestore を利用できません: ${missingFirebaseEnvVars.join(", ")}`,
    );
  }
  throw new Error(
    "[Firebase] Firestore の初期化に失敗しました。Firestore 依存の処理を続行できません。",
  );
};

const debugFirebase = (): void => {
  console.log("=== Firebase デバッグ情報 ===");
  if (!firebaseClientState.app) {
    console.log("アプリインスタンス: 利用不可");
    console.log("モード: クラウド機能なしのローカル優先");
    console.log("不足している環境変数:", missingFirebaseEnvVars.join(", "));
    console.log("=============================");
    return;
  }
  try {
    console.log("アプリ名:", firebaseClientState.app.name);
    console.log("DB インスタンス:", firestoreDb ? "あり" : "なし");
    console.log("Functions インスタンス:", functionsClient ? "あり" : "なし");
    if (firestoreDb) {
      const testRef = collection(firestoreDb, "test_connection");
      console.log("collection() 基本確認成功:", testRef.path);
    }
  } catch (error) {
    console.error("debugFirebase でエラーが発生しました:", error);
  }
  console.log("=============================");
};



const firebaseEnvStatus = createFirebaseEnvStatus();

const firebaseClientState = initializeFirebaseClient(firebaseEnvStatus);

const missingFirebaseEnvVars = firebaseEnvStatus.missingEnvVars;

const isFirebaseClientAvailable = firebaseEnvStatus.isAvailable;

const firebaseApp = firebaseClientState.app;

const auth = firebaseClientState.auth as Auth;

const storage = firebaseClientState.storage as FirebaseStorage;

const functionsClient = firebaseClientState.functionsClient as Functions;

const firestoreDb: Firestore | null = firebaseClientState.firestoreDb;

const db: Firestore | null = firebaseClientState.firestoreDb;



if (import.meta.env.DEV) {
  debugFirebase();
}



export { missingFirebaseEnvVars, isFirebaseClientAvailable, firebaseApp, auth, storage, functionsClient, firestoreDb, db, requireFirebaseClient, requireFirestoreDb };
