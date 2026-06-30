import { Inject, Injectable } from '@nestjs/common';

import { Config } from '../../../base';
import { CONFIG_TOKEN } from '../../../base/config/tokens';
import {
  buildProviderRegistry,
  type CopilotProviderRegistry,
  type CopilotProvidersConfigInput,
} from './provider-registry';

@Injectable()
export class CopilotProviderRegistryService {
  private lastConfig?: CopilotProvidersConfigInput;
  private lastRegistry?: CopilotProviderRegistry;

  constructor(@Inject(CONFIG_TOKEN) private readonly config: Config) {}

  getRegistry(): CopilotProviderRegistry {
    const providerConfig = this.config.copilot.providers;
    if (this.lastConfig === providerConfig && this.lastRegistry) {
      return this.lastRegistry;
    }

    const registry = buildProviderRegistry(providerConfig);
    this.lastConfig = providerConfig;
    this.lastRegistry = registry;
    return registry;
  }
}
