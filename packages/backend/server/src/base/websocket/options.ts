import type { FactoryProvider } from '@nestjs/common';

import type { Config } from '../config/config';
import { CONFIG_TOKEN } from '../config/tokens';

export const WEBSOCKET_OPTIONS = Symbol('WEBSOCKET_OPTIONS');

export const websocketOptionsProvider: FactoryProvider = {
  provide: WEBSOCKET_OPTIONS,
  useFactory: (config: Config) => {
    return config.websocket;
  },
  inject: [CONFIG_TOKEN],
};
