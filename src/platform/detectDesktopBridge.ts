export const hasWindowDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const isElectronUserAgent = (): boolean =>
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

export const hasDesktopBridge = (): boolean =>
  hasWindowDesktopBridge() && isElectronUserAgent();
