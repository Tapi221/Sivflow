import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "node:path";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
} as const;

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function getRendererUrlFromArgv(): string | null {
  const arg = process.argv.find((value) =>
    value.startsWith("--renderer-url="),
  );
  if (!arg) return null;
  const [, rawUrl] = arg.split("=");
  return rawUrl || null;
}

function canOpenExternal(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

async function openExternal(rawUrl: string): Promise<void> {
  if (!canOpenExternal(rawUrl)) {
    throw new Error("Blocked non-external URL");
  }
  await shell.openExternal(rawUrl);
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const rendererUrl = getRendererUrlFromArgv();
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.resolve(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:")) {
      return { action: "allow" };
    }
    void openExternal(url).catch((error) => {
      console.error("[electron] failed to open external URL", { url, error });
    });
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (targetUrl === currentUrl) return;
    if (targetUrl.startsWith("blob:")) return;
    event.preventDefault();
    void openExternal(targetUrl).catch((error) => {
      console.error("[electron] blocked navigation URL", {
        targetUrl,
        error,
      });
    });
  });

  return mainWindow;
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.appGetVersion, () => app.getVersion());
  ipcMain.handle(
    IPC_CHANNELS.shellOpenExternal,
    async (_event, rawUrl: string) => {
      await openExternal(rawUrl);
    },
  );
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
