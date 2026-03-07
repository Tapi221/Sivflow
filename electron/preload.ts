import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridgeApi } from "../src/shared/platform-api";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
} as const;

const desktopApi: DesktopBridgeApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.appGetVersion),
  },
  shell: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.shellOpenExternal, url),
  },
};

contextBridge.exposeInMainWorld("desktop", desktopApi);
