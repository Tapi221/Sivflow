import { defineModuleConfig } from '../config/register';

declare global {
  interface AppConfigSchema {
    metrics: {
      enabled: boolean;
    };
  }
}

defineModuleConfig('metrics', {
  enabled: {
    desc: 'Enable metric and tracing collection',
    default: false,
  },
});
