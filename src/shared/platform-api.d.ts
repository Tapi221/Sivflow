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

export type DesktopOauthCallbackHandler = (callbackUrl: string) => void;

export interface DesktopOauthApi {
  onCallback(handler: DesktopOauthCallbackHandler): () => void;
}

export interface DesktopBridgeApi extends PlatformApi {
  oauth: DesktopOauthApi;
}
