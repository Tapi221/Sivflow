/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_USE_FIREBASE_EMULATOR?: string;
  readonly VITE_BUILD_VERSION?: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?: string;
  readonly VITE_DESKTOP_GOOGLE_OAUTH_SCOPE?: string;
  readonly VITE_GOOGLE_OAUTH_SERVER_TOKENS?: string;
  readonly VITE_GCAL_WEBHOOK_URL?: string;
  readonly VITE_REPAIR_TAGS_ALLOWLIST?: string;
  readonly VITE_REPAIR_TAGS_ALLOWED_UIDS?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
