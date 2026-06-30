import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { defineModuleConfig } from '../config/register';

declare global {
  interface AppConfigSchema {
    db: {
      datasourceUrl: string;
      prisma: ConfigItem<Prisma.PrismaClientOptions>;
    };
  }
}

defineModuleConfig('db', {
  datasourceUrl: {
    desc: 'The PostgreSQL datasource url for the prisma client.',
    default: '',
    env: 'DATABASE_URL',
    shape: z.string(),
  },
  prisma: {
    desc: 'The config for the prisma client.',
    default: {},
    link: 'https://www.prisma.io/docs/reference/api-reference/prisma-client-reference',
  },
});
