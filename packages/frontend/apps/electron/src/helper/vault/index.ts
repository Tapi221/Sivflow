import {
  generateSlug,
  getVaultMeta,
  initVault,
  isValidVaultPath,
  selectVaultDirectory,
  writeMarkdownPage,
} from './vault';

export {
  generateSlug,
  getVaultMeta,
  initVault,
  isValidVaultPath,
  selectVaultDirectory,
  writeMarkdownPage,
};

export const vaultHandlers = {
  /**
   * フォルダ選択ダイアログを表示して vault の保存先パスを返す。
   */
  selectVaultDirectory: async () => {
    return selectVaultDirectory();
  },

  /**
   * 選択されたフォルダに pages/, assets/, .sivflow/ を作成し vault.json を初期化する。
   */
  initVault: async (
    vaultPath: string,
    workspaceId: string,
    workspaceName: string
  ) => {
    return initVault(vaultPath, workspaceId, workspaceName);
  },

  /**
   * Markdown コンテンツを pages/{slug}.md に書き出し、pages.json を更新する。
   */
  writeMarkdownPage: async (
    vaultPath: string,
    docId: string,
    title: string,
    markdownContent: string
  ) => {
    return writeMarkdownPage(vaultPath, docId, title, markdownContent);
  },

  /**
   * vault.json と pages.json を読み込んで返す。
   */
  getVaultMeta: async (vaultPath: string) => {
    return getVaultMeta(vaultPath);
  },

  /**
   * 指定パスが有効な Vault ディレクトリかどうかを検証する。
   */
  isValidVaultPath: async (vaultPath: string) => {
    return isValidVaultPath(vaultPath);
  },
};
