interface PlatformAppApi {
  getVersion(): Promise<string>;
}
interface PlatformShellApi {
  openExternal(url: string): Promise<void>;
}
interface DesktopAiGenerateInput {
  baseUrl: string;
  model: string;
  prompt: string;
}
interface DesktopAiListModelsInput {
  baseUrl: string;
}
interface DesktopAiGenerateResult {
  response: string;
}
interface DesktopAiListModelsResult {
  models: string[];
}
interface DesktopAiApi {
  generateOllama(input: DesktopAiGenerateInput): Promise<DesktopAiGenerateResult>;
  listOllamaModels(input: DesktopAiListModelsInput): Promise<string[]>;
}
interface DesktopImportFileOpenPayload {
  paths: string[];
}
interface DesktopImportFileReadResult {
  path: string;
  name: string;
  size: number;
  data: ArrayBuffer | Uint8Array | number[];
}
interface DesktopPdfOpenInput {
  fileName: string;
  data: ArrayBuffer | Uint8Array | number[];
  pageNumber?: number;
}
interface DesktopPdfOpenResult {
  path: string;
  openedWith: string;
}
type DesktopImportFileOpenHandler = (payload: DesktopImportFileOpenPayload) => void;
interface DesktopFileApi {
  readImportFile(filePath: string): Promise<DesktopImportFileReadResult>;
  selectImportFiles(): Promise<string[]>;
  onImportFileOpen(handler: DesktopImportFileOpenHandler): () => void;
}
interface DesktopPdfApi {
  openInSioyek(input: DesktopPdfOpenInput): Promise<DesktopPdfOpenResult>;
}
interface DesktopOauthCallbackPayload {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}
type DesktopOauthCallbackHandler = (payload: DesktopOauthCallbackPayload) => void;
interface PlatformOauthApi {
  start(authorizeUrl: string): Promise<void>;
  cancel(): Promise<void>;
  takePendingCallback(): Promise<DesktopOauthCallbackPayload | null>;
  exchangeIdToken(idToken: string): Promise<unknown>;
  storeRefreshToken(input: { accountId: string; refreshToken: string; }): Promise<void>;
  readRefreshToken(accountId: string): Promise<string | null>;
  deleteRefreshToken(accountId: string): Promise<void>;
  onCallback(handler: DesktopOauthCallbackHandler): () => void;
}
interface DesktopWindowApi {
  minimize(): Promise<void>;
  maximizeToggle(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedStateChange(handler: (isMaximized: boolean) => void): () => void;
}
interface PlatformApi {
  app: PlatformAppApi;
  shell: PlatformShellApi;
  oauth: PlatformOauthApi;
}
type DesktopOauthApi = PlatformOauthApi;
interface DesktopBridgeApi extends PlatformApi {
  ai: DesktopAiApi;
  files: DesktopFileApi;
  oauth: DesktopOauthApi;
  pdf: DesktopPdfApi;
  window: DesktopWindowApi;
}
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    desktop?: DesktopBridgeApi;
  }
}



export {};


export type { PlatformAppApi, PlatformShellApi, DesktopAiGenerateInput, DesktopAiListModelsInput, DesktopAiGenerateResult, DesktopAiListModelsResult, DesktopAiApi, DesktopImportFileOpenPayload, DesktopImportFileReadResult, DesktopPdfOpenInput, DesktopPdfOpenResult, DesktopImportFileOpenHandler, DesktopFileApi, DesktopPdfApi, DesktopOauthCallbackPayload, DesktopOauthCallbackHandler, PlatformOauthApi, DesktopWindowApi, PlatformApi, DesktopOauthApi, DesktopBridgeApi };
