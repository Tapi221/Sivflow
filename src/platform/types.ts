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

export type DesktopBridgeApi = PlatformApi;
