import { z } from 'zod';

export const appSchemes = z.enum([
  'affine',
  'affine-beta',
  'affine-internal',
  'affine-dev',
]);

export type Scheme = z.infer<typeof appSchemes>;
export type Channel = 'stable' | 'beta' | 'internal';

export const schemeToChannel = {
  affine: 'stable',
  'affine-beta': 'beta',
  'affine-internal': 'internal',
  'affine-dev': 'stable',
} as Record<Scheme, Channel>;

export const channelToScheme = {
  stable: BUILD_CONFIG.debug ? 'affine-dev' : 'affine',
  beta: 'affine-beta',
  internal: 'affine-internal',
} as Record<Channel, Scheme>;

export const appIconMap = {
  stable: '/imgs/app-icon-stable.ico',
  beta: '/imgs/app-icon-beta.ico',
  internal: '/imgs/app-icon-internal.ico',
} satisfies Record<Channel, string>;

export const appNames = {
  stable: 'Sivflow',
  beta: 'Sivflow Beta',
  internal: 'Sivflow Internal',
} satisfies Record<Channel, string>;

export const appSchemaUrl = z.custom<string>(
  (url: string) => {
    try {
      return appSchemes.safeParse(new URL(url).protocol.replace(':', ''))
        .success;
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL or protocol' }
);
