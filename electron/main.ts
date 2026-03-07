import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "node:path";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthCallback: "desktop:oauth:callback",
} as const;

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const CUSTOM_PROTOCOL = "manifolia";
const OAUTH_CALLBACK_HOST = "auth";
const OAUTH_CALLBACK_PATH = "/callback";

let mainWindow: BrowserWindow | null = null;
let pendingOauthCallbackUrl: string | null = null;

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

function normalizeArgValue(rawValue: string): string {
  return rawValue.replace(/^['"]|['"]$/g, "");
}

function isOauthCallbackUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === `${CUSTOM_PROTOCOL}:` &&
      parsed.hostname === OAUTH_CALLBACK_HOST &&
      parsed.pathname.startsWith(OAUTH_CALLBACK_PATH)
    );
  } catch {
    return false;
  }
}

function getCustomProtocolUrlFromArgv(argv: string[]): string | null {
  for (const rawArg of argv) {
    const arg = normalizeArgValue(rawArg);
    if (!arg.startsWith(`${CUSTOM_PROTOCOL}://`)) continue;
    if (isOauthCallbackUrl(arg)) {
      return arg;
    }
  }
  return null;
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function flushPendingOauthCallback(): void {
  if (!pendingOauthCallbackUrl) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(
    IPC_CHANNELS.oauthCallback,
    pendingOauthCallbackUrl,
  );
  pendingOauthCallbackUrl = null;
}

function handleOauthCallback(rawUrl: string): void {
  if (!isOauthCallbackUrl(rawUrl)) {
    return;
  }

  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isLoadingMainFrame()
  ) {
    pendingOauthCallbackUrl = rawUrl;
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.oauthCallback, rawUrl);
}

function registerCustomProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }
  app.setAsDefaultProtocolClient(CUSTOM_PROTOCOL);
}

function createMainWindow() {
  const windowRef = new BrowserWindow({
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
  mainWindow = windowRef;

  const rendererUrl = getRendererUrlFromArgv();
  if (rendererUrl) {
    void windowRef.loadURL(rendererUrl);
    windowRef.webContents.openDevTools({ mode: "detach" });
  } else {
    void windowRef.loadFile(path.resolve(__dirname, "../dist/index.html"));
  }

  windowRef.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:")) {
      return { action: "allow" };
    }
    void openExternal(url).catch((error) => {
      console.error("[electron] failed to open external URL", { url, error });
    });
    return { action: "deny" };
  });

  windowRef.webContents.on("will-navigate", (event, targetUrl) => {
    const currentUrl = windowRef.webContents.getURL();
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

  windowRef.webContents.on("did-finish-load", () => {
    flushPendingOauthCallback();
  });

  windowRef.on("closed", () => {
    mainWindow = null;
  });

  return windowRef;
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

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    focusMainWindow();
    const callbackUrl = getCustomProtocolUrlFromArgv(argv);
    if (callbackUrl) {
      handleOauthCallback(callbackUrl);
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    focusMainWindow();
    handleOauthCallback(url);
  });

  app.whenReady().then(() => {
    registerCustomProtocol();
    registerIpcHandlers();
    createMainWindow();

    const callbackUrl = getCustomProtocolUrlFromArgv(process.argv);
    if (callbackUrl) {
      handleOauthCallback(callbackUrl);
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
