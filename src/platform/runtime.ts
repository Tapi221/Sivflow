const hasWindowDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

const isElectronUserAgent = (): boolean =>
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

export const hasDesktopBridge = (): boolean =>
  hasWindowDesktopBridge() && isElectronUserAgent();

export const isDesktopRuntime = (): boolean => hasDesktopBridge();




