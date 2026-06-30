import type { OnModuleDestroy } from '@nestjs/common';
import {Inject,  Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import type { Config } from '../config/config';
import { CONFIG_TOKEN } from '../config/tokens';

function createPrismaOptions(config: Config): Prisma.PrismaClientOptions {
  if (config.db.datasourceUrl) {
    process.env.DATABASE_URL ??= config.db.datasourceUrl;
  }

  return config.db.prisma;
}

@Injectable()
export class PrismaFactory implements OnModuleDestroy {
  static INSTANCE: PrismaClient | null = null;
  readonly #instance: PrismaClient;

  constructor(@Inject(CONFIG_TOKEN) private readonly config: Config) {
    this.#instance = new PrismaClient(createPrismaOptions(config));
    PrismaFactory.INSTANCE = this.#instance;
  }

  get() {
    return this.#instance;
  }

  async onModuleDestroy() {
    await PrismaFactory.INSTANCE?.$disconnect();
    PrismaFactory.INSTANCE = null;
  }
}
