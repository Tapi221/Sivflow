import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridgeApi } from "../src/shared/platform-api";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthCallback: "desktop:oauth:callback",
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
    onCallback: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, callbackUrl: string) =>
        handler(callbackUrl);
      ipcRenderer.on(IPC_CHANNELS.oauthCallback, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.oauthCallback, listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld("desktop", desktopApi);
