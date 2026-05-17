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
  exchangeIdToken(input: DesktopOauthExchangeInput): Promise<string>;
  exchangeTokens(
    input: DesktopOauthExchangeInput,
  ): Promise<DesktopOauthExchangeResult>;
  onCallback(
    handler: (payload: DesktopOauthCallbackPayload) => void,
  ): () => void;
}

export interface DesktopFileApi {
  readImportFile(filePath: string): Promise<DesktopImportFileReadResult>;
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
