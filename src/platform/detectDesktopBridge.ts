const ELECTRON_USER_AGENT_PATTERN = /\bElectron\/\d+(?:\.\d+){0,2}\b/;

const hasMethod = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === "function";

const hasTauriInternals = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const hasWindowDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

export const hasElectronUserAgent = (): boolean =>
  typeof navigator !== "undefined" &&
  ELECTRON_USER_AGENT_PATTERN.test(navigator.userAgent);

export const hasDesktopBridge = (): boolean => {
  if (!hasWindowDesktopBridge()) {
    return false;
  }

  const bridge = window.desktop;

  return Boolean(
    bridge &&
    hasMethod(bridge.app?.getVersion) &&
    hasMethod(bridge.shell?.openExternal) &&
    hasMethod(bridge.oauth?.start) &&
    hasMethod(bridge.oauth?.cancel) &&
    hasMethod(bridge.oauth?.exchangeIdToken) &&
    hasMethod(bridge.oauth?.exchangeTokens) &&
    hasMethod(bridge.oauth?.refreshTokens) &&
    hasMethod(bridge.oauth?.storeRefreshToken) &&
    hasMethod(bridge.oauth?.readRefreshToken) &&
    hasMethod(bridge.oauth?.deleteRefreshToken) &&
    hasMethod(bridge.oauth?.onCallback) &&
    hasMethod(bridge.window?.minimize) &&
    hasMethod(bridge.window?.maximizeToggle) &&
    hasMethod(bridge.window?.close) &&
    hasMethod(bridge.window?.isMaximized) &&
    hasMethod(bridge.window?.onMaximizedStateChange),
  );
};

export const hasDesktopRuntime = (): boolean =>
  hasDesktopBridge() || hasElectronUserAgent() || hasTauriInternals();
