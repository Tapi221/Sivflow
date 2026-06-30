import { Inject, Injectable } from '@nestjs/common';

import { Config, OnEvent, URLHelper } from '../../base';
import { CONFIG_TOKEN } from '../../base/config/tokens';
import { fixUrl, OriginRules } from './utils';

@Injectable()
export class WorkerService {
  allowedOrigins: OriginRules;

  constructor(
    @Inject(CONFIG_TOKEN) private readonly config: Config,
    @Inject(URLHelper) private readonly url: URLHelper
  ) {
    this.allowedOrigins = [...this.url.allowedOrigins];
  }

  @OnEvent('config.init')
  onConfigInit() {
    this.allowedOrigins = [
      ...this.config.worker.allowedOrigin
        .map(u => fixUrl(u)?.origin as string)
        .filter(v => !!v),
      ...this.url.allowedOrigins,
    ];
  }

  @OnEvent('config.changed')
  onConfigChanged(event: Events['config.changed']) {
    if ('worker' in event.updates) {
      this.onConfigInit();
    }
  }
}
