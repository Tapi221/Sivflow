export type FirebaseAuthConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export const FIREBASE_EMAIL_FOR_SIGN_IN_KEY = "sivflow.firebase.emailForSignIn";
export const FIREBASE_REDIRECT_SIGN_IN_KEY = "sivflow.firebase.redirectSignIn";
export const FIREBASE_REDIRECT_SIGN_IN_TARGET_KEY =
  "sivflow.firebase.redirectSignInTarget";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getRedirectSignInStorages() {
  const storages = [getSessionStorage(), getLocalStorage()].filter(
    (storage): storage is Storage => storage !== null,
  );

  return storages.filter(
    (storage, index) => storages.findIndex(item => item === storage) === index,
  );
}

function readRedirectSignInStorageValue(key: string) {
  for (const storage of getRedirectSignInStorages()) {
    try {
      const value = storage.getItem(key);

      if (value !== null) {
        return value;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getFirebaseEnvConfig(): Partial<FirebaseAuthConfig> {
  const env = (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env;

  return {
    apiKey: env?.VITE_FIREBASE_API_KEY,
    authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env?.VITE_FIREBASE_PROJECT_ID,
    appId: env?.VITE_FIREBASE_APP_ID,
    storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export function getFirebaseAuthConfig() {
  const buildConfig = BUILD_CONFIG as typeof BUILD_CONFIG & {
    firebase?: Partial<FirebaseAuthConfig>;
    firebaseAuth?: Partial<FirebaseAuthConfig>;
  };
  const config =
    buildConfig.firebaseAuth ?? buildConfig.firebase ?? getFirebaseEnvConfig();

  if (
    !config?.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  ) {
    throw new Error(
      "Firebase Auth config is missing. Set BUILD_CONFIG.firebaseAuth or VITE_FIREBASE_* env vars.",
    );
  }

  return config as FirebaseAuthConfig;
}

export function isFirebaseAuthConfigured() {
  try {
    getFirebaseAuthConfig();
    return true;
  } catch {
    return false;
  }
}

export async function getFirebaseAuth() {
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  const app = getApps()[0] ?? initializeApp(getFirebaseAuthConfig());
  return getAuth(app);
}

export function markPendingFirebaseRedirectSignIn(redirectUrl?: string) {
  const storages = getRedirectSignInStorages();

  if (storages.length === 0) {
    return;
  }

  for (const storage of storages) {
    storage.setItem(FIREBASE_REDIRECT_SIGN_IN_KEY, "true");

    if (redirectUrl) {
      storage.setItem(FIREBASE_REDIRECT_SIGN_IN_TARGET_KEY, redirectUrl);
    } else {
      storage.removeItem(FIREBASE_REDIRECT_SIGN_IN_TARGET_KEY);
    }
  }
}

export function hasPendingFirebaseRedirectSignIn() {
  return readRedirectSignInStorageValue(FIREBASE_REDIRECT_SIGN_IN_KEY) === "true";
}

export function getPendingFirebaseRedirectSignInTarget() {
  return readRedirectSignInStorageValue(FIREBASE_REDIRECT_SIGN_IN_TARGET_KEY);
}

export function clearPendingFirebaseRedirectSignIn() {
  for (const storage of getRedirectSignInStorages()) {
    storage.removeItem(FIREBASE_REDIRECT_SIGN_IN_KEY);
    storage.removeItem(FIREBASE_REDIRECT_SIGN_IN_TARGET_KEY);
  }
}
