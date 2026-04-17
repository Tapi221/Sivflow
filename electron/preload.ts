import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopBridgeApi,
  DesktopOauthCallbackPayload,
} from "@/types/externals/desktop-api";
import { IPC_CHANNELS } from "@constants/electron/app";

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
