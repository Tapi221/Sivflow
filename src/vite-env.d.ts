/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI?: string;
  readonly VITE_DESKTOP_GOOGLE_OAUTH_SCOPE?: string;
  readonly VITE_BUILD_VERSION?: string;
  readonly VITE_REPAIR_TAGS_ALLOWLIST?: string;
  readonly VITE_REPAIR_TAGS_ALLOWED_UIDS?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}




