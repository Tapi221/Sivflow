export type WorkspaceMetadata = {
  id: string;
  flavour: string;
  initialized?: boolean;
  /**
   * local-vault flavour 専用のフィールド。
   * ユーザーが選択した Vault フォルダの絶対パス。
   * 他の flavour では undefined。
   */
  localVaultPath?: string;
};

