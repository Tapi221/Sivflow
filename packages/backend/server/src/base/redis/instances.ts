import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis as IORedis, RedisOptions } from 'ioredis';

import { Config } from '../config';

const REDIS_MAX_DB_INDEX = 15;

function assertValidDBIndex(db = 0) {
  if (!Number.isInteger(db) || db < 0 || db > REDIS_MAX_DB_INDEX) {
    throw new Error(
      // Redis は既定で [0..16) を許可します。
      // 用途ごとに `config.redis.db + [0..4]` で db を分けるため、
      // 実際に接続する db index が Redis 既定上限を超えないことを検証します。
      `database index が不正です: ${db}。0 から ${REDIS_MAX_DB_INDEX} の間にしてください`
    );
  }
}

class Redis extends IORedis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);

  constructor(options: RedisOptions) {
    assertValidDBIndex(options.db);
    super(options);
  }

  errorHandler = (err: Error) => {
    this.logger.error(err);
  };

  onModuleInit() {
    this.on('error', this.errorHandler);
  }

  async onModuleDestroy() {
    try {
      await this.quit();
    } catch {
      this.disconnect();
    }
  }

  override duplicate(override?: Partial<RedisOptions>): IORedis {
    const client = super.duplicate(override);
    client.on('error', this.errorHandler);
    return client;
  }
}

@Injectable()
export class CacheRedis extends Redis {
  constructor(@Inject(Config) config: Config) {
    super({ ...config.redis, ...config.redis.ioredis });
  }
}

@Injectable()
export class SessionRedis extends Redis {
  constructor(@Inject(Config) config: Config) {
    super({
      ...config.redis,
      ...config.redis.ioredis,
      db: (config.redis.db ?? 0) + 2,
    });
  }
}

@Injectable()
export class SocketIoRedis extends Redis {
  constructor(@Inject(Config) config: Config) {
    super({
      ...config.redis,
      ...config.redis.ioredis,
      db: (config.redis.db ?? 0) + 3,
    });
  }
}

@Injectable()
export class QueueRedis extends Redis {
  constructor(@Inject(Config) config: Config) {
    super({
      ...config.redis,
      ...config.redis.ioredis,
      db: (config.redis.db ?? 0) + 4,
      // bullmq では明示的に `null` を設定する必要があります。
      maxRetriesPerRequest: null,
    });
  }
}
