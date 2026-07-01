import { z } from 'zod';

export const supportedClient = z.enum([
  'web',
  'affine',
  'affine-beta',
  ...(BUILD_CONFIG.debug ? ['affine-dev'] : []),
]);
