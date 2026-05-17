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
  // 初回認証時のみ返却されるリフレッシュトークン
  refreshToken?: string;
}

export interface OAuthBridgePort {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  exchangeIdToken(input: OAuthBridgeTokenExchangeInput): Promise<string>;
  exchangeTokens(
    input: OAuthBridgeTokenExchangeInput,
  ): Promise<OAuthBridgeTokenExchangeResult>;
  // refresh_token を使った silent なトークン更新
  refreshTokens(input: {
    clientId: string;
    refreshToken: string;
  }): Promise<{ accessToken?: string; idToken?: string }>;
  onCallback(
    handler: (payload: OAuthBridgeCallbackPayload) => void,
  ): () => void;
}
