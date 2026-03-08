export interface PlatformAppApi {
  getVersion(): Promise<string>;
}

export interface PlatformShellApi {
  openExternal(url: string): Promise<void>;
}

export interface PlatformApi {
  app: PlatformAppApi;
  shell: PlatformShellApi;
}

export interface DesktopOauthCallbackPayload {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export type DesktopOauthCallbackHandler = (
  payload: DesktopOauthCallbackPayload,
) => void;

export interface DesktopOauthApi {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  exchangeIdToken(input: {
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<string>;
  onCallback(handler: DesktopOauthCallbackHandler): () => void;
}

export interface DesktopWindowApi {
  minimize(): Promise<void>;
  maximizeToggle(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedStateChange(handler: (isMaximized: boolean) => void): () => void;
}

export interface DesktopBridgeApi extends PlatformApi {
  oauth: DesktopOauthApi;
  window: DesktopWindowApi;
}

declare global {
  interface Window {
    desktop?: DesktopBridgeApi;
  }
}

export {};




