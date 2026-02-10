// Compile-time guard: production build では false に畳み込まれる想定。
export const DEV_MODE = import.meta.env.MODE === 'development';

export const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  hostname === '[::1]';

export const isDevLocalHost = (hostname: string): boolean =>
  DEV_MODE && isLocalHost(hostname);
