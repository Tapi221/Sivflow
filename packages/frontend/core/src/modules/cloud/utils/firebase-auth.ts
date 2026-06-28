export type FirebaseAuthConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export const FIREBASE_EMAIL_FOR_SIGN_IN_KEY =
  'sivflow.firebase.emailForSignIn';

function getFirebaseEnvConfig(): Partial<FirebaseAuthConfig> {
  const env = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

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
      'Firebase Auth config is missing. Set BUILD_CONFIG.firebaseAuth or VITE_FIREBASE_* env vars.'
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
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] ?? initializeApp(getFirebaseAuthConfig());
  return getAuth(app);
}
