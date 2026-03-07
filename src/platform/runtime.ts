export const hasDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const isDesktopRuntime = (): boolean => hasDesktopBridge();

