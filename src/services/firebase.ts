import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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

// 各サービスのエクスポート
export const auth = getAuth(app);
export const firestoreDb = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-northeast1');

// 開発環境では Storage エミュレータを利用して課金を回避
if (typeof window !== 'undefined') {
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (useEmulators && isLocalhost) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(firestoreDb, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('Firebase Emulators: Connected (Auth:9099, Firestore:8080, Storage:9199, Functions:5001)');
    } catch (e) {
      console.error('Firebase Emulators connection error:', e);
    }
  } else if (isLocalhost) {
    console.log('Firebase: Connecting to Production (Emulators disabled)');
  }
}

// Firestoreのオフライン永続化は initializeFirestore で有効化済み

// Functions: リージョンを明示的に指定（デフォルトは us-central1、firebase.json では asia-northeast1）

export default app;
