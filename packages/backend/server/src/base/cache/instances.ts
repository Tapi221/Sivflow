import { Inject, Injectable } from '@nestjs/common';

import { CacheRedis, SessionRedis } from '../redis';
import { CacheProvider } from './provider';

@Injectable()
export class Cache extends CacheProvider {
  constructor(@Inject(CacheRedis) redis: CacheRedis) {
    super(redis);
  }
}

@Injectable()
export class SessionCache extends CacheProvider {
  constructor(@Inject(SessionRedis) redis: SessionRedis) {
    super(redis);
  }
}
