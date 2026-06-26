import http, { type IncomingMessage, type ServerResponse } from "node:http";

import pg from "pg";

const { Pool } = pg;

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 8080;
const SERVICE_NAME = "sivflow-api";

let pool: pg.Pool | null = null;

const getPort = (): number => {
  const rawPort = process.env.PORT ?? `${DEFAULT_PORT}`;
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) return DEFAULT_PORT;

  return port;
};

const getDatabaseUrl = (): string | null => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl ? databaseUrl : null;
};

const getPostgresPool = (): pg.Pool => {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  pool ??= new Pool({ connectionString: databaseUrl });
  return pool;
};

const writeJson = (res: ServerResponse, statusCode: number, body: Record<string, unknown>): void => {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
};

const readPathname = (req: IncomingMessage): string => {
  const baseUrl = `http://${req.headers.host ?? "localhost"}`;
  return new URL(req.url ?? "/", baseUrl).pathname;
};

const handleReadyCheck = async (res: ServerResponse): Promise<void> => {
  await getPostgresPool().query("select 1");
  writeJson(res, 200, {
    database: "ok",
    ok: true,
    service: SERVICE_NAME,
  });
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  if (req.method === "OPTIONS") {
    writeJson(res, 204, {});
    return;
  }

  const pathname = readPathname(req);

  if (pathname === "/" || pathname === "/api") {
    writeJson(res, 200, {
      databaseConfigured: Boolean(getDatabaseUrl()),
      ok: true,
      service: SERVICE_NAME,
    });
    return;
  }

  if (pathname === "/healthz" || pathname === "/api/healthz") {
    writeJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
    });
    return;
  }

  if (pathname === "/readyz" || pathname === "/api/readyz") {
    await handleReadyCheck(res);
    return;
  }

  writeJson(res, 404, {
    error: "not_found",
    ok: false,
    path: pathname,
    service: SERVICE_NAME,
  });
};

const server = http.createServer((req, res) => {
  void handleRequest(req, res).catch((error: unknown) => {
    console.error("[cloudrun] request failed", error);
    writeJson(res, 500, {
      error: error instanceof Error ? error.message : "internal_error",
      ok: false,
      service: SERVICE_NAME,
    });
  });
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`[cloudrun] ${signal} received. shutting down.`);
  server.close(() => {
    void pool?.end().finally(() => {
      pool = null;
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(getPort(), DEFAULT_HOST, () => {
  console.log(`[cloudrun] ${SERVICE_NAME} listening on ${DEFAULT_HOST}:${getPort()}`);
});
