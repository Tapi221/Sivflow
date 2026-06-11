import { hasDesktopBridge, hasDesktopRuntime } from "./detectDesktopBridge";







export const isDesktopRuntime = (): boolean => hasDesktopRuntime();







export { hasDesktopBridge, hasDesktopRuntime };
