import { hasDesktopBridge, hasDesktopRuntime } from "./detectDesktopBridge";

export { hasDesktopBridge, hasDesktopRuntime };

export const isDesktopRuntime = (): boolean => hasDesktopRuntime();