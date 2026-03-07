import { contextBridge, ipcRenderer } from "electron";

interface DesktopBridgeApi {
  app: {
    getVersion(): Promise<string>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
}


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
