import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopBridgeApi,
  DesktopOauthCallbackPayload,
} from "../src/types/externals/desktop-api";

// sandboxed preload では相対モジュール解決で落ちることがあるため、
// preload 実行時に必要な IPC チャンネル定義は単一ファイルに閉じ込める。
const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthStart: "oauth:start",
  oauthCancel: "oauth:cancel",
  oauthExchangeIdToken: "oauth:exchangeIdToken",
  oauthCallback: "oauth:callback",
  windowMinimize: "window:minimize",
  windowMaximizeToggle: "window:maximizeToggle",
  windowClose: "window:close",
  windowIsMaximized: "window:isMaximized",
  windowMaximizedState: "window:maximizedState",
} as const;

const desktopApi: DesktopBridgeApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.appGetVersion),
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.shellOpenExternal, url),
  },
  oauth: {
    start: (authorizeUrl: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.oauthStart, authorizeUrl),
    cancel: () => ipcRenderer.invoke(IPC_CHANNELS.oauthCancel),
    exchangeIdToken: (input) =>
      ipcRenderer.invoke(IPC_CHANNELS.oauthExchangeIdToken, input),
    onCallback: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: DesktopOauthCallbackPayload,
      ) => handler(payload);

      ipcRenderer.on(IPC_CHANNELS.oauthCallback, listener);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.oauthCallback, listener);
      };
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    maximizeToggle: () => ipcRenderer.invoke(IPC_CHANNELS.windowMaximizeToggle),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
    onMaximizedStateChange: (handler: (isMaximized: boolean) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        isMaximized: boolean,
      ) => handler(isMaximized);

      ipcRenderer.on(IPC_CHANNELS.windowMaximizedState, listener);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.windowMaximizedState, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("desktop", desktopApi);
