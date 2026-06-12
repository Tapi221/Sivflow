interface OAuthBridgeCallbackPayload {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}
interface OAuthBridgePort {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  takePendingCallback(): Promise<OAuthBridgeCallbackPayload | null>;
  storeRefreshToken(input: { accountId: string; refreshToken: string; }): Promise<void>;
  readRefreshToken(accountId: string): Promise<string | null>;
  deleteRefreshToken(accountId: string): Promise<void>;
  onCallback(handler: (payload: OAuthBridgeCallbackPayload) => void): () => void;
}

export type { OAuthBridgeCallbackPayload, OAuthBridgePort };
