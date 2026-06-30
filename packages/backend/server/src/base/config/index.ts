import type { DynamicModule, Provider } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';

import { Config } from './config';
import { ConfigFactory, OVERRIDE_CONFIG_TOKEN } from './factory';
import { ConfigProvider } from './provider';
import { CONFIG_TOKEN } from './tokens';

@Global()
@Module({
  providers: [ConfigProvider, ConfigFactory],
  exports: [ConfigProvider, ConfigFactory],
})
export class ConfigModule {
  static override(overrides: DeepPartial<AppConfigSchema> = {}): DynamicModule {
    const provider: Provider = {
      provide: OVERRIDE_CONFIG_TOKEN,
      useValue: overrides,
    };

    return {
      global: true,
      module: class ConfigOverrideModule {},
      providers: [provider],
      exports: [provider],
    };
  }
}

export { Config, ConfigFactory, CONFIG_TOKEN };
export { defineModuleConfig, type JSONSchema } from './register';
