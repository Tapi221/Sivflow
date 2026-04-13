export interface OAuthBridgeCallbackPayload {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export interface OAuthBridgeTokenExchangeInput {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface OAuthBridgePort {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  exchangeIdToken(input: OAuthBridgeTokenExchangeInput): Promise<string>;
  onCallback(
    handler: (payload: OAuthBridgeCallbackPayload) => void,
  ): () => void;
}
