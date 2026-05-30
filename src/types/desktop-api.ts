export type DesktopOauthCallbackPayload = {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

export type DesktopOauthExchangeInput = {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

export type DesktopOauthExchangeResult = {
  accessToken?: string;
  idToken?: string;
  // 初回認証時のみ返却されるリフレッシュトークン
  refreshToken?: string;
  scope?: string;
};

export type DesktopImportFileOpenPayload = {
  paths: string[];
};

export type DesktopImportFileReadResult = {
  path: string;
  name: string;
  size: number;
  data: ArrayBuffer | Uint8Array | number[];
};

export interface DesktopOauthApi {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  takePendingCallback(): Promise<DesktopOauthCallbackPayload | null>;
  exchangeIdToken(input: DesktopOauthExchangeInput): Promise<string>;
  exchangeTokens(
    input: DesktopOauthExchangeInput,
  ): Promise<DesktopOauthExchangeResult>;
  // refresh_token を使った silent なトークン更新
  refreshTokens(input: {
    clientId: string;
    refreshToken: string;
  }): Promise<{ accessToken?: string; idToken?: string; scope?: string }>;
  storeRefreshToken(input: { accountId: string; refreshToken: string }): Promise<void>;
  readRefreshToken(accountId: string): Promise<string | null>;
  deleteRefreshToken(accountId: string): Promise<void>;
  onCallback(
    handler: (payload: DesktopOauthCallbackPayload) => void,
  ): () => void;
}

export interface DesktopFileApi {
  readImportFile(filePath: string): Promise<DesktopImportFileReadResult>;
  selectImportFiles(): Promise<string[]>;
  onImportFileOpen(
    handler: (payload: DesktopImportFileOpenPayload) => void,
  ): () => void;
}

export interface DesktopWindowApi {
  minimize(): Promise<void>;
  maximizeToggle(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedStateChange(handler: (isMaximized: boolean) => void): () => void;
}

export interface DesktopBridgeApi {
  app: {
    getVersion(): Promise<string>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
  files: DesktopFileApi;
  oauth: DesktopOauthApi;
  window: DesktopWindowApi;
}

export interface PlatformApi {
  app: {
    getVersion(): Promise<string>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
  oauth: DesktopOauthApi;
}

declare global {
  interface Window {
    desktop?: DesktopBridgeApi;
  }
}
