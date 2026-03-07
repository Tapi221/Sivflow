import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopBridgeApi,
  DesktopOauthCallbackPayload,
} from "../src/types/desktop-api";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthStart: "oauth:start",
  oauthCancel: "oauth:cancel",
  oauthExchangeIdToken: "oauth:exchangeIdToken",
  oauthCallback: "oauth:callback",
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
};

contextBridge.exposeInMainWorld("desktop", desktopApi);
