interface ExternalNavigationPort {
  openExternal(url: string): Promise<void>;
}

export type { ExternalNavigationPort };
