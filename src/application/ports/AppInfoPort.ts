interface AppInfoPort {
  getVersion(): Promise<string>;
}

export type { AppInfoPort };
