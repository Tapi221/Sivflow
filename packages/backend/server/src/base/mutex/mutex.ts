import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { ModuleRef, REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { nanoid } from 'nanoid';

import { GraphqlContext } from '../graphql';
import { retryable } from '../utils/promise';
import { Locker } from './locker';

export const MUTEX_RETRY = 5;
export const MUTEX_WAIT = 100;

@Injectable()
export class Mutex {
  protected logger = new Logger(Mutex.name);
  private readonly clusterIdentifier = `cluster:${nanoid()}`;

  constructor(@Inject(Locker) protected readonly locker: Locker) {}

  /**
   * resource を lock し、dispose 時に lock を解放する lock guard を返します。
   *
   * lock を取得できない場合は [MUTEX_RETRY] 回 retry します。
   *
   * 使い方:
   * ```typescript
   * {
   *   // ここで lock を取得します。
   *   await using lock = await mutex.acquire('resource-key');
   *   if (lock) {
   *     // 何らかの処理を実行します。
   *   } else {
   *     // lock の取得に失敗しました。
   *   }
   * }
   * // ここで lock が解放されます。
   * ```
   * @param key resource key
   * @returns LockGuard
   */
  async acquire(
    key: string,
    owner: string = `${this.clusterIdentifier}:${nanoid()}`
  ) {
    try {
      return await retryable(
        () => this.locker.lock(owner, key),
        MUTEX_RETRY,
        MUTEX_WAIT
      );
    } catch (e) {
      this.logger.error(
        `retry ${MUTEX_RETRY} 回後も resource [${key}] の lock に失敗しました`,
        e
      );
      return undefined;
    }
  }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestMutex extends Mutex {
  constructor(
    @Inject(REQUEST) private readonly request: Request | GraphqlContext,
    ref: ModuleRef
  ) {
    // nestjs は常に local module から locker を探して inject します。
    // そのため plugin mechanism で実装された RedisLocker は internal locker を上書きできません。
    // `ModuleRef` から手動で locker を探して取得する必要があります。
    //
    // NOTE: 通常 service の `constructor` 実行時は、期待する Locker module がまだ初期化されていない可能性があります。
    //       ただし `Scope.REQUEST` の Service では request ごとに個別の Service instance を作成します。
    //       この時点ではすべての module が初期化済みなので、`constructor` 内で正しい Locker instance を取得できます。
    super(ref.get(Locker));
  }

  protected getId() {
    const req = 'req' in this.request ? this.request.req : this.request;
    let id = req.headers['x-transaction-id'] as string;

    if (!id) {
      id = randomUUID();
      req.headers['x-transaction-id'] = id;
    }

    return id;
  }

  override acquire(key: string) {
    return super.acquire(key, this.getId());
  }
}
