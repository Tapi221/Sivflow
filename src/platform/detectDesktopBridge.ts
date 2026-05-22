export const hasWindowDesktopBridge = (): boolean =>
  typeof window !== "undefined" && typeof window.desktop !== "undefined";

const hasMethod = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === "function";

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
    hasMethod(bridge.oauth?.onCallback) &&
    hasMethod(bridge.window?.minimize) &&
    hasMethod(bridge.window?.maximizeToggle) &&
    hasMethod(bridge.window?.close) &&
    hasMethod(bridge.window?.isMaximized) &&
    hasMethod(bridge.window?.onMaximizedStateChange),
  );
};
