/// <reference types="./global.d.ts" />
import { env } from './prelude';

import { run as runCli } from './cli';
import { run as runServer } from './server';

if (env.flavors.script) {
  await runCli();
} else {
  await runServer();
}
