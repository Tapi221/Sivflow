import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import * as http from "node:http";
import * as path from "node:path";
import { URL } from "node:url";

const IPC_CHANNELS = {
  appGetVersion: "desktop:app:getVersion",
  shellOpenExternal: "desktop:shell:openExternal",
  oauthStart: "oauth:start",
  oauthCancel: "oauth:cancel",
  oauthExchangeIdToken: "oauth:exchangeIdToken",
  oauthCallback: "oauth:callback",
} as const;

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const OAUTH_LOOPBACK_HOST = "127.0.0.1";
const OAUTH_LOOPBACK_PORT = 42813;
const OAUTH_LOOPBACK_PATH = "/auth/google/callback";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

let mainWindow: BrowserWindow | null = null;
let pendingOauthCallbackUrl: string | null = null;
let oauthLoopbackServer: http.Server | null = null;

function toOauthCallbackPayload(url: string): {
  url: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} {
  const parsed = new URL(url);
  return {
    url,
    code: parsed.searchParams.get("code") ?? undefined,
    state: parsed.searchParams.get("state") ?? undefined,
    error: parsed.searchParams.get("error") ?? undefined,
    errorDescription: parsed.searchParams.get("error_description") ?? undefined,
  };
}

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
    toOauthCallbackPayload(pendingOauthCallbackUrl),
  );
  pendingOauthCallbackUrl = null;
}

function handleOauthCallback(rawUrl: string): void {
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
}

function stopOauthLoopbackServer(): void {
  if (!oauthLoopbackServer) return;
  oauthLoopbackServer.close(() => {
    console.info("[electron][oauth] loopback server closed");
  });
  oauthLoopbackServer = null;
}

function startOauthLoopbackServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    stopOauthLoopbackServer();

    const server = http.createServer((req, res) => {
      const requestUrl = new URL(
        req.url || "/",
        `http://${OAUTH_LOOPBACK_HOST}:${OAUTH_LOOPBACK_PORT}`,
      );
      const fullUrl = requestUrl.toString();
      console.info("[electron][oauth] callback received", { url: fullUrl });

      if (req.method !== "GET" || requestUrl.pathname !== OAUTH_LOOPBACK_PATH) {
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

    server.listen(OAUTH_LOOPBACK_PORT, OAUTH_LOOPBACK_HOST, () => {
      oauthLoopbackServer = server;
      console.info("[electron][oauth] loopback listen started", {
        host: OAUTH_LOOPBACK_HOST,
        port: OAUTH_LOOPBACK_PORT,
        path: OAUTH_LOOPBACK_PATH,
      });
      resolve();
    });
  });
}

function ensureOauthLoopbackRedirect(authorizeUrl: string): void {
  const parsed = new URL(authorizeUrl);
  const redirectUri = parsed.searchParams.get("redirect_uri");
  const expectedRedirectUri = `http://${OAUTH_LOOPBACK_HOST}:${OAUTH_LOOPBACK_PORT}${OAUTH_LOOPBACK_PATH}`;
  if (!redirectUri || redirectUri !== expectedRedirectUri) {
    throw new Error(
      `OAuth redirect URI mismatch. expected=${expectedRedirectUri}, actual=${redirectUri ?? "missing"}`,
    );
  }
}

function getDesktopOauthClientSecret(): string {
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
}

function createMainWindow() {
  const windowRef = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#F8FAFB",
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
    async (
      _event,
      input: {
        clientId: string;
        code: string;
        codeVerifier: string;
        redirectUri: string;
      },
    ) => {
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
      console.info("[electron][oauth] token response", {
        status: response.status,
        ok: response.ok,
        body: responseText,
      });

      let payload: { error?: string; error_description?: string; id_token?: string } =
        {};
      try {
        payload = JSON.parse(responseText) as {
          error?: string;
          error_description?: string;
          id_token?: string;
        };
      } catch {
        payload = {};
      }

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error_description ||
            payload.error ||
            `Google token exchange failed (${response.status})`,
        );
      }

      if (!payload.id_token) {
        throw new Error("Google token exchange did not return id_token");
      }

      return payload.id_token;
    },
  );
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerIpcHandlers();
    createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
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
