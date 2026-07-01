import http from "node:http";
import { HttpsError } from "firebase-functions/v2/https";
import { getAdminAuth } from "#src/firebaseAdmin.js";
import { connectGoogleCalendarAccountForUser, disconnectGoogleCalendarAccountForUser, listGoogleCalendarAccountsForUser, loadGoogleOAuthSecrets, refreshGoogleCalendarAccessTokenForUser, } from "#src/gcal/oauthPostgresService.js";
import { closePostgresPool, getPostgresPool } from "#src/postgres.js";
import { crawlTimetableSyllabusUrlForUser, runTimetableSyllabusCatalogCrawlJob, upsertTimetableSyllabusSourceRecord, } from "#src/timetable/syllabusCrawlerService.js";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 8080;
const SERVICE_NAME = "sivflow-api";
const MAX_JSON_BODY_BYTES = 1_000_000;
const getPort = () => {
    const rawPort = process.env.PORT ?? `${DEFAULT_PORT}`;
    const port = Number.parseInt(rawPort, 10);
    if (!Number.isInteger(port) || port <= 0 || port > 65_535)
        return DEFAULT_PORT;
    return port;
};
const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL?.trim());
const writeJson = (res, statusCode, body) => {
    res.writeHead(statusCode, {
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(body));
};
const readUrl = (req) => {
    const baseUrl = `http://${req.headers.host ?? "localhost"}`;
    return new URL(req.url ?? "/", baseUrl);
};
const readJsonBody = async (req) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        size += buffer.byteLength;
        if (size > MAX_JSON_BODY_BYTES)
            throw new HttpsError("invalid-argument", "Request body is too large.");
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    const rawBody = Buffer.concat(chunks).toString("utf8").trim();
    if (!rawBody)
        return {};
    try {
        const body = JSON.parse(rawBody);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new HttpsError("invalid-argument", "JSON body must be an object.");
        }
        return body;
    }
    catch (error) {
        if (error instanceof HttpsError)
            throw error;
        throw new HttpsError("invalid-argument", "Invalid JSON body.");
    }
};
const requireAuth = async (req) => {
    const header = req.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!token)
        throw new HttpsError("unauthenticated", "Authorization bearer token is required.");
    const decoded = await (await getAdminAuth()).verifyIdToken(token);
    return decoded.uid;
};
const requireAdmin = async (uid) => {
    const user = await (await getAdminAuth()).getUser(uid);
    if (user.customClaims?.admin !== true)
        throw new HttpsError("permission-denied", "Admin access is required.");
};
const readCloudRunGoogleOAuthSecrets = () => loadGoogleOAuthSecrets({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    tokenEncryptionKey: process.env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY,
});
const handleReadyCheck = async (res) => {
    await getPostgresPool().query("select 1");
    writeJson(res, 200, {
        database: "ok",
        ok: true,
        service: SERVICE_NAME,
    });
};
const handleGoogleCalendarApi = async (req, res, pathname) => {
    if (!pathname.startsWith("/api/google-calendar"))
        return false;
    const uid = await requireAuth(req);
    if (req.method === "GET" && pathname === "/api/google-calendar/accounts") {
        writeJson(res, 200, await listGoogleCalendarAccountsForUser(uid));
        return true;
    }
    if (req.method === "POST" && pathname === "/api/google-calendar/connect") {
        const response = await connectGoogleCalendarAccountForUser(uid, await readJsonBody(req), readCloudRunGoogleOAuthSecrets());
        await (await getAdminAuth()).updateUser(uid, {
            email: response.accountEmail,
            displayName: response.accountName ?? undefined,
            photoURL: response.accountPhotoUrl ?? undefined,
        });
        writeJson(res, 200, response);
        return true;
    }
    if (req.method === "POST" && (pathname === "/api/google-calendar/token" || pathname === "/api/google-calendar/access-token")) {
        writeJson(res, 200, await refreshGoogleCalendarAccessTokenForUser(uid, await readJsonBody(req), readCloudRunGoogleOAuthSecrets()));
        return true;
    }
    if (req.method === "POST" && pathname === "/api/google-calendar/disconnect") {
        writeJson(res, 200, await disconnectGoogleCalendarAccountForUser(uid, await readJsonBody(req)));
        return true;
    }
    const accountPathPrefix = "/api/google-calendar/accounts/";
    if (req.method === "DELETE" && pathname.startsWith(accountPathPrefix)) {
        const accountId = decodeURIComponent(pathname.slice(accountPathPrefix.length));
        writeJson(res, 200, await disconnectGoogleCalendarAccountForUser(uid, { accountId }));
        return true;
    }
    if (req.method === "POST" && pathname === "/api/google-calendar/custom-token") {
        writeJson(res, 200, { customToken: await (await getAdminAuth()).createCustomToken(uid) });
        return true;
    }
    writeJson(res, 404, {
        error: "not_found",
        ok: false,
        path: pathname,
        service: SERVICE_NAME,
    });
    return true;
};
const handleTimetableApi = async (req, res, pathname) => {
    if (!pathname.startsWith("/api/timetable"))
        return false;
    const uid = await requireAuth(req);
    if (req.method === "POST" && pathname === "/api/timetable/syllabus/crawl") {
        writeJson(res, 200, await crawlTimetableSyllabusUrlForUser(await readJsonBody(req), uid));
        return true;
    }
    if (req.method === "POST" && pathname === "/api/timetable/syllabus/sources") {
        await requireAdmin(uid);
        writeJson(res, 200, await upsertTimetableSyllabusSourceRecord(await readJsonBody(req)));
        return true;
    }
    if (req.method === "POST" && pathname === "/api/timetable/syllabus/run-catalog-crawl") {
        await requireAdmin(uid);
        writeJson(res, 200, await runTimetableSyllabusCatalogCrawlJob());
        return true;
    }
    writeJson(res, 404, {
        error: "not_found",
        ok: false,
        path: pathname,
        service: SERVICE_NAME,
    });
    return true;
};
const getStatusCodeFromError = (error) => {
    if (!(error instanceof HttpsError))
        return 500;
    switch (error.code) {
        case "invalid-argument":
            return 400;
        case "unauthenticated":
            return 401;
        case "permission-denied":
            return 403;
        case "not-found":
            return 404;
        case "resource-exhausted":
            return 429;
        case "failed-precondition":
            return 412;
        case "unavailable":
            return 503;
        default:
            return 500;
    }
};
const writeError = (res, error) => {
    const statusCode = getStatusCodeFromError(error);
    const body = {
        error: error instanceof Error ? error.message : "internal_error",
        ok: false,
        service: SERVICE_NAME,
    };
    if (error instanceof HttpsError) {
        body.code = error.code;
        body.details = error.details;
    }
    writeJson(res, statusCode, body);
};
const handleRequest = async (req, res) => {
    if (req.method === "OPTIONS") {
        writeJson(res, 204, {});
        return;
    }
    const url = readUrl(req);
    const pathname = url.pathname;
    if (pathname === "/" || pathname === "/api") {
        writeJson(res, 200, {
            databaseConfigured: isDatabaseConfigured(),
            googleOAuthConfigured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
                process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
                process.env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY?.trim()),
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
    if (await handleGoogleCalendarApi(req, res, pathname))
        return;
    if (await handleTimetableApi(req, res, pathname))
        return;
    writeJson(res, 404, {
        error: "not_found",
        ok: false,
        path: pathname,
        service: SERVICE_NAME,
    });
};
const server = http.createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
        console.error("[cloudrun] request failed", error);
        writeError(res, error);
    });
});
const shutdown = (signal) => {
    console.log(`[cloudrun] ${signal} を受信しました。シャットダウンします。`);
    server.close(() => {
        void closePostgresPool().finally(() => {
            process.exit(0);
        });
    });
    setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.listen(getPort(), DEFAULT_HOST, () => {
    console.log(`[cloudrun] ${SERVICE_NAME} は ${DEFAULT_HOST}:${getPort()} で待ち受けています`);
});
