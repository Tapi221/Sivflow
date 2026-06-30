import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultHost = '127.0.0.1';
const defaultPort = 8080;
const portScanLimit = 20;
const requestTimeoutMs = 1500;

const parsePort = value => {
  if (!value) {
    return undefined;
  }

  const port = Number.parseInt(value, 10);

  return Number.isInteger(port) && port > 0 && port < 65536
    ? port
    : undefined;
};

const getCliPortOption = args => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--port' || arg === '-p') {
      return {
        port: parsePort(args[index + 1]),
        flagIndex: index,
        valueIndex: index + 1,
      };
    }

    if (arg.startsWith('--port=')) {
      return {
        port: parsePort(arg.slice('--port='.length)),
        flagIndex: index,
      };
    }
  }

  return undefined;
};

const replaceCliPort = (args, port) => {
  const nextArgs = [...args];
  const option = getCliPortOption(nextArgs);

  if (!option) {
    nextArgs.push('--port', String(port));
    return nextArgs;
  }

  if (option.valueIndex !== undefined) {
    nextArgs[option.valueIndex] = String(port);
    return nextArgs;
  }

  nextArgs[option.flagIndex] = `--port=${port}`;
  return nextArgs;
};

const isPortFree = port =>
  new Promise(resolve => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host: defaultHost, port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });

const isSivflowDevServer = port =>
  new Promise(resolve => {
    const request = http.get(
      {
        host: defaultHost,
        port,
        path: '/',
        timeout: requestTimeoutMs,
      },
      response => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', chunk => {
          if (body.length < 4096) {
            body += chunk;
          }
        });
        response.on('end', () => {
          resolve(
            body.includes('/@vite/client') &&
              body.includes('<title>Sivflow</title>')
          );
        });
      }
    );

    request.once('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.once('error', () => resolve(false));
  });

const findExistingOrFreePort = async requestedPort => {
  let firstFreePort;

  for (let offset = 0; offset < portScanLimit; offset += 1) {
    const port = requestedPort + offset;

    if (await isPortFree(port)) {
      firstFreePort ??= port;
      continue;
    }

    if (await isSivflowDevServer(port)) {
      return { existingPort: port };
    }
  }

  if (firstFreePort !== undefined) {
    return { freePort: firstFreePort };
  }

  throw new Error(
    `No available port found between ${requestedPort} and ${
      requestedPort + portScanLimit - 1
    }.`
  );
};

const cliArgs = process.argv.slice(2);
const requestedPort =
  getCliPortOption(cliArgs)?.port ??
  parsePort(process.env.SIVFLOW_WEB_PORT) ??
  defaultPort;
const { existingPort, freePort } = await findExistingOrFreePort(requestedPort);

if (existingPort !== undefined) {
  console.log(
    `[dev:web] Sivflow web is already running at http://${defaultHost}:${existingPort}.`
  );
  process.exit(0);
}

if (freePort !== requestedPort) {
  console.log(
    `[dev:web] Port ${requestedPort} is already in use. Starting on ${freePort} instead.`
  );
}

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.resolve(scriptsDir, '../node_modules/vite/bin/vite.js');
const child = spawn(
  process.execPath,
  [viteBin, ...replaceCliPort(cliArgs, freePort)],
  {
    env: {
      ...process.env,
      SIVFLOW_WEB_PORT: String(freePort),
    },
    stdio: 'inherit',
  }
);

child.once('error', error => {
  console.error(`[dev:web] Failed to start Vite: ${error.message}`);
  process.exit(1);
});
child.once('exit', code => {
  process.exit(code ?? 0);
});
