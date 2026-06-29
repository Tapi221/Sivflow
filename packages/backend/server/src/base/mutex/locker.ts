import { Inject, Injectable, Logger } from '@nestjs/common';
import { Command } from 'ioredis';

import { SessionRedis } from '../redis';
import { Lock } from './lock';

const lockScript = `local key = KEYS[1]
local owner = ARGV[1]

if redis.call("get", key) == owner then
  redis.call("expire", key, 60)
  return 2
elseif redis.call("set", key, owner, "NX", "EX", 60) then
  return 1
else
  return 0
end`;

const unlockScript = `local key = KEYS[1]
local owner = ARGV[1]

local value = redis.call("get", key)
if value == owner then
  return redis.call("del", key)
elseif value == nil then
  return 1
else
  return 0
end`;

@Injectable()
export class Locker {
  private readonly logger = new Logger(Locker.name);

  constructor(@Inject(SessionRedis) private readonly redis: SessionRedis) {}

  async lock(owner: string, key: string): Promise<Lock> {
    const lockKey = `MutexLock:${key}`;
    this.logger.verbose(`Client ${owner} is trying to lock resource ${key}`);

    const success = await this.redis.sendCommand(
      new Command('EVAL', [lockScript, '1', lockKey, owner])
    );

    if (success === 2) {
      return new Lock(async () => {
        /* noop */
      });
    }

    if (success === 1) {
      return new Lock(async () => {
        const result = await this.redis.sendCommand(
          new Command('EVAL', [unlockScript, '1', lockKey, owner])
        );

        if (result === 0) {
          throw new Error(`Failed to release lock ${key}`);
        }
      });
    }

    throw new Error(`Failed to acquire lock for resource [${key}]`);
  }
}
