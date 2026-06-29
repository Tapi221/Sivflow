import '../prelude';

import { PrismaClient } from '@prisma/client';

import {
  createSeedFactory,
  Mockers,
  type SeedMockerInput,
} from './mocks';

const args = process.argv.slice(2);

if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log(`
seed [Entity] [count] [[field]=[val]]

Checkout [server/src/seed/mocks.ts] for all available Entities and Inputs

examples:

$ seed User                                  Create an User
$ seed User 3                                Create 3 Users
$ seed User feature=pro_plan_v1              Create an User with Pro feature
$ seed TeamWorkspace id=xxx                  Seed a workspace with Team feature
$ seed Workspace id=xxx public=true          Seed with boolean property
$ seed TeamWorkspace id=xxx quantity=10n     Seed with numberic property, use \`={num}n\` suffix
`);
  process.exit(0);
}

const name = args.shift() as keyof typeof Mockers;
const Mocker = Mockers[name];

if (!name || !Mocker) {
  throw new Error(
    'First argument must be one of: ' + JSON.stringify(Object.keys(Mockers))
  );
}

const client = new PrismaClient();
const create = createSeedFactory(client, {
  logger: (val: unknown) => {
    console.log(`${name} ${JSON.stringify(val)}`);
  },
});

type ParsedArgs = {
  overrides: Record<string, unknown>;
  count: number;
};

function parseArgs(args: string[]): ParsedArgs {
  const overrides: Record<string, unknown> = {};
  let count: number = 1;

  args.forEach(arg => {
    const kvSep = arg.indexOf('=');
    if (kvSep > 0) {
      const key = arg.slice(0, kvSep);
      const val = arg.slice(kvSep + 1);

      if (/[\d]+n$/.test(val)) {
        const num = Number(val.slice(0, -1));
        if (Number.isNaN(num)) {
          throw new Error(`Invalid numeric parameter: ${arg}`);
        }
        overrides[key] = num;
      } else if (val.length === 4 && val.toLowerCase() === 'true') {
        overrides[key] = true;
      } else if (val.length === 5 && val.toLowerCase() === 'false') {
        overrides[key] = false;
      } else {
        overrides[key] = val;
      }
    } else {
      const maybeCount = Number(arg);
      if (!Number.isInteger(maybeCount) || maybeCount < 1) {
        console.warn(
          `Invalid count parameter: ${arg}. Count must be a positive integer.`
        );
        return;
      }
      count = maybeCount;
    }
  });

  return {
    overrides,
    count,
  };
}

const { overrides, count } = parseArgs(args);

try {
  await create(
    Mocker,
    overrides as Partial<SeedMockerInput<typeof Mocker>>,
    count
  );
} finally {
  await client.$disconnect();
}
