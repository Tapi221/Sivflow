export interface ExternalNavigationPort {
  openExternal(url: string): Promise<void>;
}
