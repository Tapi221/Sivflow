export interface PlatformAppApi { getVersion(): Promise<string>;
}

export interface PlatformShellApi { openExternal(url: string): Promise<void>;
}

export interface DesktopImportFileOpenPayload { paths: string[];
}

export interface DesktopImportFileReadResult { path: string;
  name: string;
  size: number;
  data: ArrayBuffer | Uint8Array | number[];
}

export type DesktopImportFileOpenHandler = (payload: DesktopImportFileOpenPayload) => void;

export interface DesktopFileApi { readImportFile(filePath: string): Promise<DesktopImportFileReadResult>;
  selectImportFiles(): Promise<string[]>;
  onImportFileOpen(handler: DesktopImportFileOpenHandler): () => void;
}

export interface DesktopOauthCallbackPayload { url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export type DesktopOauthCallbackHandler = (payload: DesktopOauthCallbackPayload) => void;

export interface PlatformOauthApi { start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  takePendingCallback(): Promise<DesktopOauthCallbackPayload | null>;
  exchangeIdToken(idToken: string): Promise<unknown>;
  storeRefreshToken(input: { accountId: string; refreshToken: string; }): Promise<void>;
  readRefreshToken(accountId: string): Promise<string | null>;
  deleteRefreshToken(accountId: string): Promise<void>;
  onCallback(handler: DesktopOauthCallbackHandler): () => void;
}

export interface DesktopWindowApi { minimize(): Promise<void>;
  maximizeToggle(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedStateChange(handler: (isMaximized: boolean) => void): () => void;
}

export interface PlatformApi { app: PlatformAppApi;
  shell: PlatformShellApi;
  oauth: PlatformOauthApi;
}

export type DesktopOauthApi = PlatformOauthApi;

export interface DesktopBridgeApi extends PlatformApi { files: DesktopFileApi;
  oauth: DesktopOauthApi;
  window: DesktopWindowApi;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    desktop?: DesktopBridgeApi;
  }
}

export {};
