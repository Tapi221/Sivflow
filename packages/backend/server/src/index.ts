/// <reference types="./global.d.ts" />
import { env } from './prelude';
import { traceStartup } from './startup-trace';

traceStartup('index.ts loaded');

if (env.flavors.script) {
  traceStartup('launching CLI flavor');
  const { run: runCli } = await import('./cli');
  await runCli();
} else {
  traceStartup('launching server flavor');
  const { run: runServer } = await import('./server');
  await runServer();
}
