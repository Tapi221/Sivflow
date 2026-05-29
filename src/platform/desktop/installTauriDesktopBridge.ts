import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DesktopBridgeApi, DesktopImportFileOpenPayload, DesktopOauthCallbackPayload } from "@/types/externals/desktop-api";

const hasWindowDesktop = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

const desktopApi: DesktopBridgeApi = {
  app: {
    getVersion: () => invoke<string>("app_get_version"),
  },
  shell: {
    openExternal: (url: string) => invoke<void>("shell_open_external", { url }),
  },
  files: {
    readImportFile: (filePath: string) => invoke("desktop_import_read_file", { filePath }),
    selectImportFiles: () => invoke<string[]>("desktop_import_select_files"),
    onImportFileOpen: (handler) => {
      let unsubscribe: (() => void) | null = null;
      const unlistenPromise = listen<DesktopImportFileOpenPayload>("desktop:importFile:open", (event) => {
        handler(event.payload);
      });

      void unlistenPromise.then((unlisten) => {
        unsubscribe = unlisten;
      });

      return () => {
        unsubscribe?.();
        unsubscribe = null;
      };
    },
  },
  oauth: {
    start: (authorizeUrl: string) => invoke<void>("oauth_start", { authorizeUrl }),
    cancel: () => invoke<void>("oauth_cancel"),
    exchangeIdToken: (input) => invoke<string>("oauth_exchange_id_token", { input }),
    exchangeTokens: (input) => invoke("oauth_exchange_tokens", { input }),
    refreshTokens: (input) => invoke("oauth_refresh_tokens", { input }),
    storeRefreshToken: (input) => invoke<void>("oauth_store_refresh_token", { input }),
    readRefreshToken: (accountId: string) => invoke<string | null>("oauth_read_refresh_token", { accountId }),
    deleteRefreshToken: (accountId: string) => invoke<void>("oauth_delete_refresh_token", { accountId }),
    onCallback: (handler) => {
      let unsubscribe: (() => void) | null = null;
      const unlistenPromise = listen<DesktopOauthCallbackPayload>("oauth:callback", (event) => {
        handler(event.payload);
      });

      void unlistenPromise.then((unlisten) => {
        unsubscribe = unlisten;
      });

      return () => {
        unsubscribe?.();
        unsubscribe = null;
      };
    },
  },
  window: {
    minimize: () => invoke<void>("window_minimize"),
    maximizeToggle: () => invoke<void>("window_maximize_toggle"),
    close: () => invoke<void>("window_close"),
    isMaximized: () => invoke<boolean>("window_is_maximized"),
    onMaximizedStateChange: (handler) => {
      let unsubscribe: (() => void) | null = null;
      const unlistenPromise = listen<boolean>("window:maximizedState", (event) => {
        handler(event.payload);
      });

      void unlistenPromise.then((unlisten) => {
        unsubscribe = unlisten;
      });

      return () => {
        unsubscribe?.();
        unsubscribe = null;
      };
    },
  },
};

if (typeof window !== "undefined" && !hasWindowDesktop() && "__TAURI_INTERNALS__" in window) {
  window.desktop = desktopApi;
}
