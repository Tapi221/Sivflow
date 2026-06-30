import { z } from 'zod';

import { defineModuleConfig } from '../config/register';

declare global {
  interface AppConfigSchema {
    crypto: {
      privateKey: string;
      previousPrivateKeys: string[];
    };
  }
}

defineModuleConfig('crypto', {
  privateKey: {
    desc: 'The private key for used by the crypto module to create signed tokens or encrypt data.',
    env: 'AFFINE_PRIVATE_KEY',
    default: '',
    schema: { type: 'string' },
  },
  previousPrivateKeys: {
    desc: 'Previous private keys used to verify signatures and decrypt data after key rotation.',
    default: [],
    schema: { type: 'array', items: { type: 'string' } },
    shape: z.array(z.string()),
  },
});
