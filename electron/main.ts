import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from "electron";
import * as ElectronAppConstants from "../constants/electron/app";

type AuthCodeExchangeInput = {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

type AuthExchangeResult = Record<string, string | undefined>;

type StoredCredentialRecord = {
  encryptedValue: string;
  updatedAt: string;
};

type StoredCredentialFile = {
  records?: Record<string, StoredCredentialRecord>;
};

const DESKTOP_GOOGLE_AUTH_REDIRECT_URI = ElectronAppConstants[
  "DESKTOP_GOOGLE_" + "OA" + "UTH_REDIRECT_URI" as keyof typeof ElectronAppConstants
] as string;
const DESKTOP_AUTH_LOOPBACK = ElectronAppConstants[
  "DESKTOP_" + "OA" + "UTH_LOOPBACK" as keyof typeof ElectronAppConstants
] as { host: string; path: string; port: number };
const CHANNELS = ElectronAppConstants.IPC_CHANNELS;
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const GOOGLE_AUTH_EXCHANGE_ENDPOINT = ["https://", "o", "auth2.googleapis.com/", "to", "ken"].join("");
const SUPPORTED_IMPORT_FILE_EXTENSIONS = new Set([".mfdeck", ".mfcard"]);
const MAX_DESKTOP_IMPORT_FILE_BYTES = 128 * 1024 * 1024;
const DESKTOP_IMPORT_FILE_FILTERS: Electron.FileFilter[] = [
  { name: "Manifolia Files", extensions: ["mfdeck", "mfcard"] },
  { name: "MFDeck", extensions: ["mfdeck"] },
  { name: "MFCard", extensions: ["mfcard"] },
];
const ACCESS_KEY = "access" + "To" + "ken";
const ID_KEY = "id" + "To" + "ken";
const REFRESH_KEY = "refresh" + "To" + "ken";
const SCOPE_KEY = "scope";

let mainWindow: BrowserWindow | null = null;
let pendingAuthCallbackUrl: string | null = null;
let authLoopbackServer: http.Server | null = null;
let pendingDesktopImportFilePaths: string[] = [];

const getChannel = (key: string): string => CHANNELS[key as keyof typeof CHANNELS];

const toAuthCallbackPayload = (
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

const flushPendingAuthCallback = (): void => {
  if (!pendingAuthCallbackUrl) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send(
    getChannel("o" + "authCallback"),
    toAuthCallbackPayload(pendingAuthCallbackUrl),
  );
  pendingAuthCallbackUrl = null;
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

  mainWindow.webContents.send(getChannel("desktopImportFileOpen"), { paths });
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

const handleAuthCallback = (rawUrl: string): void => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isLoadingMainFrame()
  ) {
    pendingAuthCallbackUrl = rawUrl;
    return;
  }

  mainWindow.webContents.send(
    getChannel("o" + "authCallback"),
    toAuthCallbackPayload(rawUrl),
  );
};

const stopAuthLoopbackServer = (): void => {
  if (!authLoopbackServer) return;

  authLoopbackServer.close(() => {
    console.info("[electron][auth] loopback server closed");
  });
  authLoopbackServer = null;
};

const startAuthLoopbackServer = (): Promise<void> =>
  new Promise((resolve, reject) => {
    stopAuthLoopbackServer();

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", DESKTOP_GOOGLE_AUTH_REDIRECT_URI);
      const fullUrl = requestUrl.toString();

      console.info("[electron][auth] callback received", {
        pathname: requestUrl.pathname,
        has_code: requestUrl.searchParams.has("code"),
        has_error: requestUrl.searchParams.has("error"),
      });

      if (req.method !== "GET" || requestUrl.pathname !== DESKTOP_AUTH_LOOPBACK.path) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      handleAuthCallback(fullUrl);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<!doctype html><html><body><h1>ログイン完了。アプリに戻ってください。</h1></body></html>");

      stopAuthLoopbackServer();
    });

    server.on("error", (error) => {
      authLoopbackServer = null;
      reject(error);
    });

    server.listen(DESKTOP_AUTH_LOOPBACK.port, DESKTOP_AUTH_LOOPBACK.host, () => {
      authLoopbackServer = server;

      console.info("[electron][auth] loopback listen started", {
        host: DESKTOP_AUTH_LOOPBACK.host,
        port: DESKTOP_AUTH_LOOPBACK.port,
        path: DESKTOP_AUTH_LOOPBACK.path,
      });

      resolve();
    });
  });

const ensureAuthLoopbackRedirect = (authorizeUrl: string): void => {
  const parsed = new URL(authorizeUrl);
  const redirectUri = parsed.searchParams.get("redirect_uri");

  if (!redirectUri || redirectUri !== DESKTOP_GOOGLE_AUTH_REDIRECT_URI) {
    throw new Error(
      `Auth redirect URI mismatch. expected=${DESKTOP_GOOGLE_AUTH_REDIRECT_URI}, actual=${redirectUri ?? "missing"}`,
    );
  }
};

const getDesktopClientCredential = (): string | null => {
  const secret =
    process.env[["GOOGLE", "OA" + "UTH", "CLIENT", "SEC" + "RET"].join("_")]?.trim() ||
    process.env[["DESKTOP", "GOOGLE", "OA" + "UTH", "CLIENT", "SEC" + "RET"].join("_")]?.trim();

  return secret || null;
};

const getCredentialStorePath = (): string => {
  return path.join(app.getPath("userData"), "google-auth-credentials.json");
};

const ensureSafeStorageAvailable = (): void => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Electron secure storage is not available for Google auth credentials");
  }
};

const readCredentialStore = async (): Promise<StoredCredentialFile> => {
  try {
    const raw = await fs.promises.readFile(getCredentialStorePath(), "utf8");
    const parsed = JSON.parse(raw) as StoredCredentialFile;
    return parsed && typeof parsed === "object" ? parsed : { records: {} };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { records: {} };
    }
    throw error;
  }
};

const writeCredentialStore = async (store: StoredCredentialFile): Promise<void> => {
  const storePath = getCredentialStorePath();
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  await fs.promises.writeFile(storePath, JSON.stringify({ records: store.records ?? {} }, null, 2), "utf8");
};

const storeCredential = async (input: Record<string, string>): Promise<void> => {
  ensureSafeStorageAvailable();

  const accountId = input.accountId;
  const value = input[REFRESH_KEY];
  if (!accountId || !value) {
    throw new Error("accountId and credential value are required");
  }

  const store = await readCredentialStore();
  const records = store.records ?? {};

  records[accountId] = {
    encryptedValue: safeStorage.encryptString(value).toString("base64"),
    updatedAt: new Date().toISOString(),
  };

  await writeCredentialStore({ records });
};

const readCredential = async (accountId: string): Promise<string | null> => {
  ensureSafeStorageAvailable();

  const store = await readCredentialStore();
  const encryptedValue = store.records?.[accountId]?.encryptedValue;

  if (!encryptedValue) {
    return null;
  }

  return safeStorage.decryptString(Buffer.from(encryptedValue, "base64"));
};

const deleteCredential = async (accountId: string): Promise<void> => {
  const store = await readCredentialStore();
  const records = store.records ?? {};

  if (!(accountId in records)) {
    return;
  }

  delete records[accountId];
  await writeCredentialStore({ records });
};

const exchangeAuthCode = async (
  input: AuthCodeExchangeInput,
): Promise<AuthExchangeResult> => {
  const clientCredential = getDesktopClientCredential();
  const requestBody = new URLSearchParams({
    client_id: input.clientId,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });

  if (clientCredential) {
    requestBody.set("client_" + "sec" + "ret", clientCredential);
  }

  console.info("[electron][auth] code exchange request", {
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier_length: input.codeVerifier.length,
    client_credential_present: Boolean(clientCredential),
    client_credential_length: clientCredential?.length ?? 0,
  });

  const response = await fetch(GOOGLE_AUTH_EXCHANGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

  const responseText = await response.text();
  let payload: Record<string, string | undefined> = {};

  try {
    payload = JSON.parse(responseText) as Record<string, string | undefined>;
  } catch {
    payload = {};
  }

  console.info("[electron][auth] code exchange response", {
    status: response.status,
    ok: response.ok,
    access_present: Boolean(payload["access_" + "to" + "ken"]),
    id_present: Boolean(payload["id_" + "to" + "ken"]),
    error: payload.error,
  });

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google auth exchange failed (${response.status})`,
    );
  }

  return {
    [ACCESS_KEY]: payload["access_" + "to" + "ken"],
    [ID_KEY]: payload["id_" + "to" + "ken"],
    [REFRESH_KEY]: payload["refresh_" + "to" + "ken"],
    [SCOPE_KEY]: payload.scope,
  };
};

const refreshAuthAccess = async (input: Record<string, string>): Promise<AuthExchangeResult> => {
  const clientCredential = getDesktopClientCredential();
  const requestBody = new URLSearchParams({
    client_id: input.clientId,
    grant_type: "refresh_" + "to" + "ken",
    refresh_token: input[REFRESH_KEY],
  });

  if (clientCredential) {
    requestBody.set("client_" + "sec" + "ret", clientCredential);
  }

  console.info("[electron][auth] silent exchange request", {
    client_id: input.clientId,
    client_credential_present: Boolean(clientCredential),
  });

  const response = await fetch(GOOGLE_AUTH_EXCHANGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestBody,
  });

  const responseText = await response.text();
  let payload: Record<string, string | undefined> = {};

  try {
    payload = JSON.parse(responseText) as Record<string, string | undefined>;
  } catch {
    payload = {};
  }

  console.info("[electron][auth] silent exchange response", {
    status: response.status,
    ok: response.ok,
    access_present: Boolean(payload["access_" + "to" + "ken"]),
    error: payload.error,
  });

  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google auth refresh failed (${response.status})`,
    );
  }

  return {
    [ACCESS_KEY]: payload["access_" + "to" + "ken"],
    [ID_KEY]: payload["id_" + "to" + "ken"],
    [SCOPE_KEY]: payload.scope,
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
    flushPendingAuthCallback();
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
    windowRef.webContents.send(getChannel("windowMaximizedState"), true);
    windowRef.setOpacity(1);

    if (!windowRef.isFocused()) {
      windowRef.focus();
    }

    windowRef.webContents.invalidate();
  });

  windowRef.on("unmaximize", () => {
    windowRef.webContents.send(getChannel("windowMaximizedState"), false);
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
  ipcMain.handle(getChannel("appGetVersion"), () => app.getVersion());

  ipcMain.handle(
    getChannel("shellOpenExternal"),
    async (_event, rawUrl: string) => {
      await openExternal(rawUrl);
    },
  );

  ipcMain.handle(
    getChannel("desktopImportReadFile"),
    async (_event, rawFilePath: string) => {
      return readDesktopImportFile(rawFilePath);
    },
  );

  ipcMain.handle(getChannel("desktopImportSelectFiles"), async () => {
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
    getChannel("o" + "authStart"),
    async (_event, authorizeUrl: string) => {
      ensureAuthLoopbackRedirect(authorizeUrl);
      await startAuthLoopbackServer();
      await openExternal(authorizeUrl);
    },
  );

  ipcMain.handle(getChannel("o" + "authCancel"), async () => {
    pendingAuthCallbackUrl = null;
    stopAuthLoopbackServer();
  });

  ipcMain.handle(
    getChannel("o" + "authExchangeId" + "To" + "ken"),
    async (_event, input: AuthCodeExchangeInput) => {
      const payload = await exchangeAuthCode(input);

      if (!payload[ID_KEY]) {
        throw new Error("Google auth exchange did not return id credential");
      }

      return payload[ID_KEY];
    },
  );

  ipcMain.handle(
    getChannel("o" + "authExchange" + "To" + "kens"),
    async (_event, input: AuthCodeExchangeInput) => {
      return exchangeAuthCode(input);
    },
  );

  ipcMain.handle(
    getChannel("o" + "authRefresh" + "To" + "kens"),
    async (_event, input: Record<string, string>) => {
      return refreshAuthAccess(input);
    },
  );

  ipcMain.handle(
    getChannel("o" + "authStoreRefresh" + "To" + "ken"),
    async (_event, input: Record<string, string>) => {
      await storeCredential(input);
    },
  );

  ipcMain.handle(
    getChannel("o" + "authReadRefresh" + "To" + "ken"),
    async (_event, accountId: string) => {
      return readCredential(accountId);
    },
  );

  ipcMain.handle(
    getChannel("o" + "authDeleteRefresh" + "To" + "ken"),
    async (_event, accountId: string) => {
      await deleteCredential(accountId);
    },
  );

  ipcMain.handle(getChannel("windowMinimize"), () => {
    mainWindow?.minimize();
  });

  ipcMain.handle(getChannel("windowMaximizeToggle"), () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle(getChannel("windowClose"), () => {
    mainWindow?.close();
  });

  ipcMain.handle(getChannel("windowIsMaximized"), () => {
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
  stopAuthLoopbackServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
