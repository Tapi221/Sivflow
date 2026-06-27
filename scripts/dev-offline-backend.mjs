import http from 'node:http';

const host = process.env.SIVFLOW_OFFLINE_BACKEND_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? process.env.AFFINE_SERVER_PORT ?? '3010', 10);
const appVersion = '0.26.3';

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': 'http://127.0.0.1:8080',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type,x-operation-name',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': 'http://127.0.0.1:8080',
    'access-control-allow-credentials': 'true',
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseGraphQLBody(req, rawBody) {
  const contentType = req.headers['content-type'] ?? '';
  const headerOperation = req.headers['x-operation-name'];

  if (typeof headerOperation === 'string' && headerOperation.length > 0) {
    return { operationName: headerOperation };
  }

  if (contentType.includes('application/json')) {
    try {
      const body = JSON.parse(rawBody || '{}');
      return {
        operationName: body.operationName,
        query: body.query,
        variables: body.variables,
      };
    } catch {
      return {};
    }
  }

  return {};
}

function serverConfig() {
  return {
    version: appVersion,
    baseUrl: 'http://127.0.0.1:8080',
    name: 'Sivflow Offline Backend',
    features: [],
    type: 'selfhosted',
    initialized: true,
    credentialsRequirement: {
      password: {
        minLength: 8,
        maxLength: 128,
      },
    },
    availableUpgrade: null,
    availableUserFeatures: [],
    availableWorkspaceFeatures: [],
  };
}

function emptyPage() {
  return {
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    edges: [],
  };
}

function offlineDataFor(operationName) {
  switch (operationName) {
    case 'serverConfig':
    case 'adminServerConfig':
      return { serverConfig: serverConfig() };

    case 'currentUser':
    case 'getCurrentUser':
      return { currentUser: null };

    case 'subscription':
    case 'getWorkspaceSubscription':
      return { [operationName]: null };

    case 'listNotifications':
      return { notifications: emptyPage() };

    case 'listUserAccessTokens':
      return { listUserAccessTokens: [] };

    case 'adminDashboard':
      return {
        adminDashboard: {
          syncActiveUsers: 0,
          syncActiveUsersTimeline: [],
          copilotConversations: 0,
          workspaceStorageBytes: 0,
          blobStorageBytes: 0,
          workspaceStorageHistory: [],
          blobStorageHistory: [],
          topSharedLinks: [],
          generatedAt: new Date().toISOString(),
        },
      };

    default:
      return { [operationName || 'offline']: null };
  }
}

async function handleGraphQL(req, res) {
  const rawBody = await readBody(req);
  const request = parseGraphQLBody(req, rawBody);
  const operationName = request.operationName || 'unknownOperation';

  sendJson(res, 200, {
    data: offlineDataFor(operationName),
    extensions: {
      sivflowOfflineBackend: true,
      note: 'DB/Redisなしのローカル画面確認用モック応答です。クラウド同期・認証・AI・管理機能は使えません。',
    },
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

    if (req.method === 'OPTIONS') {
      sendText(res, 204, '');
      return;
    }

    if (url.pathname === '/healthz' || url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, mode: 'offline', service: 'sivflow-offline-backend' });
      return;
    }

    if (url.pathname === '/api/auth/session') {
      sendJson(res, 200, null);
      return;
    }

    if (url.pathname === '/api/auth/csrf') {
      sendJson(res, 200, { csrfToken: 'sivflow-offline-csrf-token' });
      return;
    }

    if (url.pathname.startsWith('/api/auth/')) {
      sendJson(res, 200, { ok: true, offline: true });
      return;
    }

    if (url.pathname === '/graphql') {
      await handleGraphQL(req, res);
      return;
    }

    if (url.pathname.startsWith('/oauth/')) {
      sendJson(res, 404, {
        error: 'offline_backend',
        message: 'OAuth はオフラインモックバックエンドでは使えません。',
      });
      return;
    }

    if (url.pathname.startsWith('/socket.io/')) {
      sendJson(res, 200, { ok: true, offline: true });
      return;
    }

    sendJson(res, 404, {
      error: 'not_found',
      path: url.pathname,
      offline: true,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: 'offline_backend_error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`[Sivflow] Offline backend listening on http://${host}:${port}`);
  console.log('[Sivflow] DB / Redis / Docker は不要です。クラウド機能はモック応答になります。');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
