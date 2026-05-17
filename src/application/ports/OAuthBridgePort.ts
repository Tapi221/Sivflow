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

export interface OAuthBridgeTokenExchangeResult {
  accessToken?: string;
  idToken?: string;
}

export interface OAuthBridgePort {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  exchangeIdToken(input: OAuthBridgeTokenExchangeInput): Promise<string>;
  exchangeTokens(
    input: OAuthBridgeTokenExchangeInput,
  ): Promise<OAuthBridgeTokenExchangeResult>;
  onCallback(
    handler: (payload: OAuthBridgeCallbackPayload) => void,
  ): () => void;
}
