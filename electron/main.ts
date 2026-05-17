import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import {
  DESKTOP_GOOGLE_OAUTH_REDIRECT_URI,
  DESKTOP_OAUTH_LOOPBACK,
  IPC_CHANNELS,
} from "../constants/electron/app";

if (process.platform === "win32") {
  app.disableHardwareAcceleration();
}

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SUPPORTED_IMPORT_FILE_EXTENSIONS = new Set([".mfdeck", ".mfcard"]);
const MAX_DESKTOP_IMPORT_FILE_BYTES = 128 * 1024 * 1024;
const DESKTOP_IMPORT_FILE_FILTERS: Electron.FileFilter[] = [
  { name: "Manifolia Files", extensions: ["mfdeck", "mfcard"] },
  { name: "MFDeck", extensions: ["mfdeck"] },
  { name: "MFCard", extensions: ["mfcard"] },
];

let mainWindow: BrowserWindow | null = null;
let pendingOauthCallbackUrl: string | null = null;
let oauthLoopbackServer: http.Server | null = null;
let pendingDesktopImportFilePaths: string[] = [];

type GoogleOauthTokenExchangeInput = {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

type GoogleOauthTokenExchangeResult = {
  accessToken?: string;
  idToken?: string;
  // refresh_token は offline_access スコープ付きの初回認証時のみ返却される
  refreshToken?: string;
};

app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

const toOauthCallbackPayload = (
  url: string,
): {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} => {
  const parsed = new URL(url);

  return {
    url,
    code: parsed.searchParams.get("code") ?? undefined,
    state: parsed.searchParams.get("state") ?? undefined,
    error: parsed.searchParams.get("error") ?? undefined,
    errorDescription: parsed.searchParams.get("error_description") ?? undefined,
  };
};

const getRendererUrlFromArgv = (): string | null => {
  const arg = process.argv.find((value) => value.startsWith("--renderer-url="));
  if (!arg) return null;

  const [, rawUrl] = arg.split("=");
  return rawUrl || null;
};

const canOpenExternal = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
};

const openExternal = async (rawUrl: string): Promise<void> => {
  if (!canOpenExternal(rawUrl)) {
    throw new Error("Blocked non-external URL");
  }

  await shell.openExternal(rawUrl);
};

const focusMainWindow = (): void => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.setOpacity(1);
  mainWindow.focus();

  if (!mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.invalidate();
  }
};

const flushPendingOauthCallback = (): void => {
  if (!pendingOauthCallbackUrl) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send(
    IPC_CHANNELS.oauthCallback,
    toOauthCallbackPayload(pendingOauthCallbackUrl),
  );
  pendingOauthCallbackUrl = null;
};

const stripWrappingQuotes = (value: string): string => {
  return value.replace(/^"+|"+$/g, "");
};

const resolveFileUrlPath = (value: string): string | null => {
  try {
    return fileURLToPath(value);
  } catch {
    return null;
  }
};

const normalizeDesktopImportFilePath = (value: string): string | null => {
  const trimmed = stripWrappingQuotes(value.trim());

  if (!trimmed || trimmed.startsWith("--")) {
    return null;
  }

  const candidate = trimmed.startsWith("file://")
    ? resolveFileUrlPath(trimmed)
    : trimmed;

  if (!candidate) {
    return null;
  }

  const extension = path.extname(candidate).toLowerCase();
  if (!SUPPORTED_IMPORT_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  const resolvedPath = path.resolve(candidate);

  try {
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return resolvedPath;
};

const collectDesktopImportFilePaths = (values: readonly string[]): string[] => {
  const paths = new Set<string>();

  for (const value of values) {
    const normalizedPath = normalizeDesktopImportFilePath(value);
    if (normalizedPath) {
      paths.add(normalizedPath);
    }
  }

  return Array.from(paths);
};

const flushPendingDesktopImportFiles = (): void => {
  if (pendingDesktopImportFilePaths.length === 0) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isDestroyed()) return;
  if (mainWindow.webContents.isLoadingMainFrame()) return;

  const paths = [...pendingDesktopImportFilePaths];
  pendingDesktopImportFilePaths = [];

  mainWindow.webContents.send(IPC_CHANNELS.desktopImportFileOpen, { paths });
};

const enqueueDesktopImportFiles = (values: readonly string[]): void => {
  const paths = collectDesktopImportFilePaths(values);
  if (paths.length === 0) return;

  pendingDesktopImportFilePaths = Array.from(
    new Set([...pendingDesktopImportFilePaths, ...paths]),
  );

  flushPendingDesktopImportFiles();
};

const readDesktopImportFile = async (
  rawFilePath: string,
): Promise<{
  path: string;
  name: string;
  size: number;
  data: Buffer;
}> => {
  const normalizedPath = normalizeDesktopImportFilePath(rawFilePath);

  if (!normalizedPath) {
    throw new Error("Unsupported import file path");
  }

  const stat = await fs.promises.stat(normalizedPath);

  if (!stat.isFile()) {
    throw new Error("Import path is not a file");
  }

  if (stat.size > MAX_DESKTOP_IMPORT_FILE_BYTES) {
    throw new Error("Import file is too large");
  }

  const data = await fs.promises.readFile(normalizedPath);

  return {
    path: normalizedPath,
    name: path.basename(normalizedPath),
    size: stat.size,
    data,
  };
};

const handleOauthCallback = (rawUrl: string): void => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isLoadingMainFrame()
  ) {
    pendingOauthCallbackUrl = rawUrl;
    return;
  }

  mainWindow.webContents.send(
    IPC_CHANNELS.oauthCallback,
    toOauthCallbackPayload(rawUrl),
  );
};

const stopOauthLoopbackServer = (): void => {
  if (!oauthLoopbackServer) return;

  oauthLoopbackServer.close(() => {
    console.info("[electron][oauth] loopback server closed");
  });
  oauthLoopbackServer = null;
};

const startOauthLoopbackServer = (): Promise<void> =>
  new Promise((resolve, reject) => {
    stopOauthLoopbackServer();

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(
        req.url || "/",
        DESKTOP_GOOGLE_OAUTH_REDIRECT_URI,
      );
      const fullUrl = requestUrl.toString();

      console.info("[electron][oauth] callback received", { url: fullUrl });

      if (
        req.method !== "GET" ||
        requestUrl.pathname !== DESKTOP_OAUTH_LOOPBACK.path
      ) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      handleOauthCallback(fullUrl);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><html><body><h1>ログイン完了。アプリに戻ってください。</h1></body></html>",
      );

      stopOauthLoopbackServer();
    });

    server.on("error", (error) => {
      oauthLoopbackServer = null;
      reject(error);
    });

    server.listen(
      DESKTOP_OAUTH_LOOPBACK.port,
      DESKTOP_OAUTH_LOOPBACK.host,
      () => {
        oauthLoopbackServer = server;

        console.info("[electron][oauth] loopback listen started", {
          host: DESKTOP_OAUTH_LOOPBACK.host,
          port: DESKTOP_OAUTH_LOOPBACK.port,
          path: DESKTOP_OAUTH_LOOPBACK.path,
        });

        resolve();
      },
    );
  });

const ensureOauthLoopbackRedirect = (authorizeUrl: string): void => {
  const parsed = new URL(authorizeUrl);
  const redirectUri = parsed.searchParams.get("redirect_uri");
  const expectedRedirectUri = DESKTOP_GOOGLE_OAUTH_REDIRECT_URI;

  if (!redirectUri || redirectUri !== expectedRedirectUri) {
    throw new Error(
      `OAuth redirect URI mismatch. expected=${expectedRedirectUri}, actual=${redirectUri ?? "missing"}`,
    );
  }
};

const getDesktopOauthClientSecret = (): string => {
  const secret =
    process.env.GOOGLE_OAUTH_WEB_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.DESKTOP_GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "GOOGLE_OAUTH_WEB_CLIENT_SECRET is not configured in main process environment",
    );
  }

  return secret;
};

const exchangeGoogleOauthTokens = async (
  input: GoogleOauthTokenExchangeInput,
): Promise<GoogleOauthTokenExchangeResult> => {
  const clientSecret = getDesktopOauthClientSecret();
  const requestBody = new URLSearchParams({
    client_id: input.clientId,
    client_secret: clientSecret,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });

  console.info("[electron][oauth] token request", {
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier_length: input.codeVerifier.length,
    client_secret_present: clientSecret.length > 0,
    client_secret_length: clientSecret.length,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

  const responseText = await response.text();
  let payload: {
    access_token?: string;
    error?: string;
    error_description?: string;
    id_token?: string;
    refresh_token?: string;
  } = {};

  try {
    payload = JSON.parse(responseText) as {
      access_token?: string;
      error?: string;
      error_description?: string;
      id_token?: string;
      refresh_token?: string;
    };
  } catch {
    payload = {};
  }

  console.info("[electron][oauth] token response", {
    status: response.status,
    ok: response.ok,
    access_token_present: Boolean(payload.access_token),
    id_token_present: Boolean(payload.id_token),
    error: payload.error,
  });

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google token exchange failed (${response.status})`,
    );
  }

  return {
    accessToken: payload.access_token,
    idToken: payload.id_token,
    // Google は初回同意時のみ refresh_token を返す
    refreshToken: payload.refresh_token,
  };
};

/**
 * refresh_token を使って新しい access_token を取得する。
 * ポップアップ不要で呼び出せるため、アプリ再起動後の自動復元に使用する。
 */
const refreshGoogleOauthAccessToken = async ({
  clientId,
  refreshToken,
}: {
  clientId: string;
  refreshToken: string;
}): Promise<GoogleOauthTokenExchangeResult> => {
  const clientSecret = getDesktopOauthClientSecret();
  const requestBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  console.info("[electron][oauth] refresh_token request", {
    client_id: clientId,
    client_secret_present: clientSecret.length > 0,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

  const responseText = await response.text();
  let payload: {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  } = {};

  try {
    payload = JSON.parse(responseText) as typeof payload;
  } catch {
    payload = {};
  }

  console.info("[electron][oauth] refresh_token response", {
    status: response.status,
    ok: response.ok,
    access_token_present: Boolean(payload.access_token),
    error: payload.error,
  });

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google token refresh failed (${response.status})`,
    );
  }

  return {
    accessToken: payload.access_token,
    idToken: payload.id_token,
  };
};

const createMainWindow = (): BrowserWindow => {
  const windowRef = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#EEF3F6",
    transparent: false,
    backgroundMaterial: "none",
    frame: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow = windowRef;

  const rendererUrl = getRendererUrlFromArgv();

  if (rendererUrl) {
    void windowRef.loadURL(rendererUrl);
    windowRef.webContents.openDevTools({ mode: "detach" });
  } else {
    void windowRef.loadFile(path.resolve(__dirname, "../../dist/index.html"));
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
    flushPendingDesktopImportFiles();
  });

  windowRef.once("ready-to-show", () => {
    if (!windowRef.isDestroyed()) {
      windowRef.setOpacity(1);
      windowRef.show();

      if (!windowRef.isFocused()) {
        windowRef.focus();
      }

      if (!windowRef.webContents.isDestroyed()) {
        windowRef.webContents.invalidate();
      }
    }
  });

  windowRef.on("closed", () => {
    mainWindow = null;
  });

  windowRef.on("maximize", () => {
    windowRef.webContents.send(IPC_CHANNELS.windowMaximizedState, true);
    windowRef.setOpacity(1);

    if (!windowRef.isFocused()) {
      windowRef.focus();
    }

    windowRef.webContents.invalidate();
  });

  windowRef.on("unmaximize", () => {
    windowRef.webContents.send(IPC_CHANNELS.windowMaximizedState, false);
    windowRef.setOpacity(1);

    if (!windowRef.isFocused()) {
      windowRef.focus();
    }

    windowRef.webContents.invalidate();
  });

  windowRef.on("restore", () => {
    windowRef.setOpacity(1);

    if (!windowRef.isFocused()) {
      windowRef.focus();
    }

    windowRef.webContents.invalidate();
  });

  windowRef.on("focus", () => {
    windowRef.setOpacity(1);
    windowRef.webContents.invalidate();
  });

  windowRef.on("show", () => {
    windowRef.setOpacity(1);

    if (!windowRef.isFocused()) {
      windowRef.focus();
    }

    windowRef.webContents.invalidate();
  });

  return windowRef;
};

const registerIpcHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.appGetVersion, () => app.getVersion());

  ipcMain.handle(
    IPC_CHANNELS.shellOpenExternal,
    async (_event, rawUrl: string) => {
      await openExternal(rawUrl);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.desktopImportReadFile,
    async (_event, rawFilePath: string) => {
      return readDesktopImportFile(rawFilePath);
    },
  );

  ipcMain.handle(IPC_CHANNELS.desktopImportSelectFiles, async () => {
    const openDialogOptions: Electron.OpenDialogOptions = {
      title: "MFDeck / MFCard を選択",
      properties: ["openFile", "multiSelections"],
      filters: DESKTOP_IMPORT_FILE_FILTERS,
    };

    const ownerWindow =
      mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;

    const result = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);

    if (result.canceled) {
      return [];
    }

    return collectDesktopImportFilePaths(result.filePaths);
  });

  ipcMain.handle(
    IPC_CHANNELS.oauthStart,
    async (_event, authorizeUrl: string) => {
      ensureOauthLoopbackRedirect(authorizeUrl);
      await startOauthLoopbackServer();
      await openExternal(authorizeUrl);
    },
  );

  ipcMain.handle(IPC_CHANNELS.oauthCancel, async () => {
    pendingOauthCallbackUrl = null;
    stopOauthLoopbackServer();
  });

  ipcMain.handle(
    IPC_CHANNELS.oauthExchangeIdToken,
    async (_event, input: GoogleOauthTokenExchangeInput) => {
      const payload = await exchangeGoogleOauthTokens(input);

      if (!payload.idToken) {
        throw new Error("Google token exchange did not return id_token");
      }

      return payload.idToken;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.oauthExchangeTokens,
    async (_event, input: GoogleOauthTokenExchangeInput) => {
      return exchangeGoogleOauthTokens(input);
    },
  );

  // refresh_token を使った silent なトークン更新ハンドラ
  ipcMain.handle(
    IPC_CHANNELS.oauthRefreshTokens,
    async (
      _event,
      input: { clientId: string; refreshToken: string },
    ) => {
      return refreshGoogleOauthAccessToken(input);
    },
  );

  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => {
    mainWindow?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.windowMaximizeToggle, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.windowClose, () => {
    mainWindow?.close();
  });

  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => {
    return mainWindow?.isMaximized() ?? false;
  });
};

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    focusMainWindow();
    enqueueDesktopImportFiles(commandLine);
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    enqueueDesktopImportFiles([filePath]);
    focusMainWindow();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerIpcHandlers();
    createMainWindow();
    enqueueDesktopImportFiles(process.argv);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        flushPendingDesktopImportFiles();
      }
    });
  });
}

app.on("window-all-closed", () => {
  stopOauthLoopbackServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
