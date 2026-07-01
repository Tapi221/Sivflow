import net from 'node:net';

const DEFAULT_TIMEOUT_MS = 1500;

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function probeTcpService({ label, host, port, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let done = false;

    const finish = ok => {
      if (done) {
        return;
      }

      done = true;
      socket.destroy();
      resolve({ label, host, port, ok });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function probeRedisService({ label, host, port, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let done = false;
    let buffer = '';

    const finish = ok => {
      if (done) {
        return;
      }

      done = true;
      socket.destroy();
      resolve({ label, host, port, ok });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      const reply = buffer.trim();

      if (!reply) {
        return;
      }

      if (reply.startsWith('+PONG') || reply.startsWith('-NOAUTH')) {
        finish(true);
        return;
      }

      if (reply.startsWith('-LOADING')) {
        finish(false);
        return;
      }

      if (reply.startsWith('-')) {
        finish(true);
      }
    });
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.once('close', () => finish(false));
  });
}

const checks = [
  {
    label: 'PostgreSQL',
    host: process.env.POSTGRES_HOST ?? '127.0.0.1',
    port: numberFromEnv('POSTGRES_PORT', 5432),
    probe: probeTcpService,
  },
  {
    label: 'Redis',
    host: process.env.REDIS_SERVER_HOST ?? '127.0.0.1',
    port: numberFromEnv('REDIS_SERVER_PORT', 6379),
    probe: probeRedisService,
  },
];

const results = await Promise.all(checks.map(check => check.probe(check)));
const failed = results.filter(result => !result.ok);

for (const result of results) {
  const mark = result.ok ? 'OK' : 'NG';
  console.log(`[Sivflow] ${result.label}: ${mark} (${result.host}:${result.port})`);
}

if (failed.length > 0) {
  console.error('');
  console.error('[Sivflow] ローカルサービスに接続できません。');
  console.error('[Sivflow] PostgreSQL 16 + pgvector と Redis をOS側で起動してください。');
  console.error('[Sivflow] PostgreSQLの例: host=127.0.0.1 port=5432 user=sivflow db=sivflow');
  console.error('[Sivflow] Redisの例: host=127.0.0.1 port=6379');
  process.exit(1);
}
