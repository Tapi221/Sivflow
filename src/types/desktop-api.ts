export type DesktopOauthCallbackPayload = {
  url: string;
  state?: string | null;
};

export type DesktopOauthExchangeInput = {
  idToken: string;
  nonce?: string | null;
};

export interface DesktopOauthApi {
  start(authorizeUrl: string): Promise<unknown>;
  cancel(): Promise<void>;
  exchangeIdToken(input: DesktopOauthExchangeInput): Promise<unknown>;
  onCallback(handler: (payload: DesktopOauthCallbackPayload) => void): () => void;
}

export interface DesktopBridgeApi {
  app: {
    getVersion(): Promise<string>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
  oauth: DesktopOauthApi;
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
    desktop: DesktopBridgeApi;
  }
}
