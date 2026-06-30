import type { FactoryProvider } from '@nestjs/common';

import { ConfigFactory } from './factory';
import { CONFIG_TOKEN } from './tokens';

export const ConfigProvider: FactoryProvider = {
  provide: CONFIG_TOKEN,
  useFactory: (factory: ConfigFactory) => {
    return factory.config;
  },
  inject: [ConfigFactory],
};
