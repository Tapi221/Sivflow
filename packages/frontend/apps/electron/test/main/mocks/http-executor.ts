import http from 'node:https';

import { HttpExecutor } from 'builder-util-runtime';
import type { ClientRequest } from 'electron';

/**
 * test 用です。次と同等の実装です:
 * https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/electronHttpExecutor.ts
 */
export class MockedHttpExecutor extends HttpExecutor<ClientRequest> {
  createRequest(
    options: any,
    callback: (response: any) => void
  ): ClientRequest {
    if (options.headers && options.headers.Host) {
      // headers.Host から host 値を設定します。
      options.host = options.headers.Host;
      // header property の 'Host' を削除します。削除しないと net::ERR_INVALID_ARGUMENT exception が発生します。
      delete options.headers.Host;
    }

    const request = http.request(options);
    request.on('response', callback);
    return request as unknown as ClientRequest;
  }
}
